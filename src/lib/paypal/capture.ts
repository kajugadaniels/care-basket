import "server-only";
import { z } from "zod";
import { usdMinor } from "@/lib/money";
import type { PayPalClient } from "./client";
import { PayPalError } from "./errors";
import { orderIdSchema } from "./schemas";

const amountSchema = z.object({ currency_code: z.literal("USD"), value: z.string().refine((value) => {
	try { return usdMinor(value) > 0; } catch { return false; }
}) });
const captureSchema = z.object({
	id: orderIdSchema,
	status: z.enum(["COMPLETED", "PENDING", "DECLINED", "DENIED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "REVERSED"]),
	amount: amountSchema,
	final_capture: z.literal(true),
	create_time: z.iso.datetime({ offset: true }),
});
const orderSchema = z.object({
	id: orderIdSchema, intent: z.literal("CAPTURE"),
	status: z.enum(["CREATED", "SAVED", "APPROVED", "VOIDED", "COMPLETED", "PAYER_ACTION_REQUIRED"]),
	purchase_units: z.array(z.object({ reference_id: z.uuid(), custom_id: z.uuid(), amount: amountSchema,
		payments: z.object({ captures: z.array(captureSchema).max(1).optional(),
			authorizations: z.array(z.unknown()).max(0).optional() }).optional(),
	})).length(1),
});

export type CaptureBinding = { id: string; basketId: string; paypalOrderId: string | null;
	paypalCaptureId?: string | null; amountMinor: number; currency: string };
export type VerifiedPayment = { status: "CREATED" | "APPROVED" | "PENDING" | "CAPTURED" | "DENIED" | "REFUNDED" | "REVERSED";
	captureId: string | null; capturedAt: Date | null };

// The same strict identity/money verifier serves capture, refresh and webhook reconciliation.
export function verifyPayment(value: unknown, payment: CaptureBinding): VerifiedPayment {
	const parsed = orderSchema.safeParse(value);
	if (!parsed.success) throw new PayPalError("INVALID_RESPONSE");
	const order = parsed.data;
	const unit = order.purchase_units[0];
	if (order.id !== payment.paypalOrderId || unit.reference_id !== payment.basketId || unit.custom_id !== payment.id
		|| payment.currency !== "USD" || usdMinor(unit.amount.value) !== payment.amountMinor) throw new PayPalError("INVALID_RESPONSE");
	const capture = unit.payments?.captures?.[0];
	if (!capture) {
		if (!["CREATED", "PAYER_ACTION_REQUIRED", "APPROVED"].includes(order.status) || payment.paypalCaptureId) throw new PayPalError("INVALID_RESPONSE");
		return { status: order.status === "APPROVED" ? "APPROVED" : "CREATED", captureId: null, capturedAt: null };
	}
	if (usdMinor(capture.amount.value) !== payment.amountMinor
		|| (payment.paypalCaptureId && payment.paypalCaptureId !== capture.id)) throw new PayPalError("INVALID_RESPONSE");
	if (!["APPROVED", "COMPLETED"].includes(order.status)) throw new PayPalError("INVALID_RESPONSE");
	if (["COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED", "REVERSED"].includes(capture.status) && order.status !== "COMPLETED") {
		throw new PayPalError("INVALID_RESPONSE");
	}
	const status = capture.status === "REVERSED" ? "REVERSED" : capture.status === "COMPLETED" ? "CAPTURED" : capture.status === "PENDING" ? "PENDING"
		: ["REFUNDED", "PARTIALLY_REFUNDED"].includes(capture.status) ? "REFUNDED" : "DENIED";
	return { status, captureId: capture.id, capturedAt: ["CAPTURED", "REFUNDED", "REVERSED"].includes(status) ? new Date(capture.create_time) : null };
}

export async function readVerifiedPayment(client: PayPalClient, payment: CaptureBinding) {
	if (!payment.paypalOrderId) throw new PayPalError("INVALID_RESPONSE");
	return verifyPayment(await client.orderRequest(`/v2/checkout/orders/${orderIdSchema.parse(payment.paypalOrderId)}`), payment);
}

// Refund/reversal events can contain a refund ID, not the original capture ID.
// Extract identifiers only; never fetch a provider-supplied URL.
export function captureIdFromLinks(links: { rel: string; href: string }[] = []) {
	for (const link of links) {
		if (link.rel !== "up") continue;
		const match = /^https:\/\/(?:api-m|api)\.sandbox\.paypal\.com\/v2\/payments\/captures\/([A-Z0-9]{1,36})$/.exec(link.href);
		if (match) return match[1];
	}
	return undefined;
}

export async function verifyReversal(client: PayPalClient, payment: CaptureBinding, captureId: string,
	resourceId: string, refund: boolean) {
	if (!payment.paypalOrderId || (payment.paypalCaptureId && payment.paypalCaptureId !== captureId)) throw new PayPalError("INVALID_RESPONSE");
	const capture = z.object({ id: orderIdSchema, amount: amountSchema, status: z.string(),
		supplementary_data: z.object({ related_ids: z.object({ order_id: orderIdSchema }) }),
	}).parse(await client.paymentRequest(`/v2/payments/captures/${orderIdSchema.parse(captureId)}`));
	if (capture.id !== captureId || capture.supplementary_data.related_ids.order_id !== payment.paypalOrderId
		|| usdMinor(capture.amount.value) !== payment.amountMinor) throw new PayPalError("INVALID_RESPONSE");
	if (resourceId !== captureId) {
		const result = z.object({ id: orderIdSchema, status: z.literal("COMPLETED"), amount: amountSchema,
			links: z.array(z.object({ rel: z.string(), href: z.string().max(500) })).max(20),
		}).parse(await client.paymentRequest(`/v2/payments/refunds/${orderIdSchema.parse(resourceId)}`));
		if (result.id !== resourceId || captureIdFromLinks(result.links) !== captureId
			|| usdMinor(result.amount.value) > payment.amountMinor) throw new PayPalError("INVALID_RESPONSE");
	}
	if (!["REFUNDED", "PARTIALLY_REFUNDED", "REVERSED"].includes(capture.status)) throw new PayPalError("INVALID_RESPONSE");
	// A signed reversal classifies the adjustment, but cannot establish it without
	// these fresh, identity-bound resources. A later refund must not hide a reversal.
	return capture.status === "REVERSED" || !refund ? "REVERSED" as const : "REFUNDED" as const;
}
