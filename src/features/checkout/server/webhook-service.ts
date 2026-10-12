import "server-only";
import { z } from "zod";
import { getPayPalClient } from "@/lib/paypal/client";
import { captureIdFromLinks, readVerifiedPayment, verifyReversal } from "@/lib/paypal/capture";
import { PayPalError } from "@/lib/paypal/errors";
import { orderIdSchema } from "@/lib/paypal/schemas";
import { WebhookInputError } from "@/lib/paypal/webhooks";
import { getDb } from "@/server/db/client";
import { commitVerifiedPayment } from "./confirmation-repository";
import { finishApproval, finishUnmatched, receiveWebhook, recordVerificationFailure, type VerifiedEventInput } from "./payment-events";
import { paymentSelect } from "./persistence";

const envelopeSchema = z.object({ id: z.string().min(1).max(80).regex(/^[A-Za-z0-9-]+$/),
	event_type: z.string().min(1).max(100).regex(/^[A-Z0-9_.-]+$/), resource: z.unknown().optional() });
const resourceSchema = z.object({ id: orderIdSchema,
	supplementary_data: z.object({ related_ids: z.object({ order_id: orderIdSchema.optional(), capture_id: orderIdSchema.optional() }) }).optional(),
	links: z.array(z.object({ rel: z.string().max(40), href: z.string().max(500) })).max(20).optional(),
});
const SUPPORTED = new Set(["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.PENDING",
	"PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED"]);

// Only the signature-verified route may call this entry point.
export async function processVerifiedWebhook(value: unknown): Promise<string | null> {
	const parsed = envelopeSchema.safeParse(value);
	if (!parsed.success) throw new WebhookInputError(400);
	const body = parsed.data;
	const resource = resourceSchema.safeParse(body.resource);
	const event: VerifiedEventInput = { source: "WEBHOOK", paypalEventId: body.id, eventType: body.event_type,
		...(resource.success ? { resourceId: resource.data.id } : {}) };
	const saved = await receiveWebhook(event);
	if (saved.processedAt) return null;
	if (!SUPPORTED.has(body.event_type)) { await finishUnmatched(event, "IGNORED"); return null; }
	if (!resource.success) throw new WebhookInputError(400);
	const client = getPayPalClient();
	const approved = body.event_type === "CHECKOUT.ORDER.APPROVED";
	const refund = body.event_type === "PAYMENT.CAPTURE.REFUNDED";
	const reversed = body.event_type === "PAYMENT.CAPTURE.REVERSED";
	const captureId = approved ? undefined : (refund || reversed) ? resource.data.supplementary_data?.related_ids.capture_id
		?? captureIdFromLinks(resource.data.links) ?? resource.data.id : resource.data.id;
	let orderId = approved ? resource.data.id : resource.data.supplementary_data?.related_ids.order_id;
	// Initial system correlation is exclusively by verified provider identifiers, not family/name/amount.
	let payment = orderId ? await getDb().payment.findUnique({ where: { paypalOrderId: orderId }, select: paymentSelect })
		: captureId ? await getDb().payment.findUnique({ where: { paypalCaptureId: captureId }, select: paymentSelect }) : null;
	if (!payment && !orderId && captureId) {
		const capture = z.object({ id: orderIdSchema, supplementary_data: z.object({ related_ids: z.object({ order_id: orderIdSchema }) }) })
			.parse(await client.paymentRequest(`/v2/payments/captures/${captureId}`));
		if (capture.id !== captureId) throw new PayPalError("INVALID_RESPONSE");
		orderId = capture.supplementary_data.related_ids.order_id;
		payment = await getDb().payment.findUnique({ where: { paypalOrderId: orderId }, select: paymentSelect });
	}
	if (!payment) { await finishUnmatched(event, "UNMATCHED"); return null; }
	if (payment.paypalClientId !== client.clientId) throw new PayPalError("CONFIGURATION");
	try {
		let verified = await readVerifiedPayment(client, payment);
		if (approved && verified.status !== "APPROVED") {
			// Approval alone is never a payment confirmation, even if the order has advanced.
			await finishApproval(event, payment);
			return payment.requestId;
		}
		if (!approved && captureId !== verified.captureId) throw new PayPalError("INVALID_RESPONSE");
		if ((refund || reversed) && captureId) {
			const status = await verifyReversal(client, payment, captureId, resource.data.id, refund);
			verified = { ...verified, status };
		}
		await commitVerifiedPayment(payment, verified, event, { type: "system" });
		return payment.requestId;
	} catch (error) {
		if (error instanceof z.ZodError || error instanceof PayPalError && error.kind === "INVALID_RESPONSE") {
			await recordVerificationFailure(payment);
		}
		throw error;
	}
}
