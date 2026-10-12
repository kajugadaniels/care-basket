import "server-only";
import { getPayPalEnv } from "@/lib/env/server";
import { formatMoney } from "@/lib/format";
import type { CheckoutDto } from "../types";
import { CAPTURE_REPLAY_WINDOW_MS, type PaymentAttempt } from "./persistence";

export function checkoutDto(payment: PaymentAttempt): CheckoutDto {
	const expired = payment.captureStartedAt && Date.now() - payment.captureStartedAt.getTime() >= CAPTURE_REPLAY_WINDOW_MS;
	const state = payment.status === "APPROVED" && expired ? "REVIEW_REQUIRED" : payment.status === "CREATED" ? payment.captureStartedAt ? "REVIEW_REQUIRED"
		: payment.paypalOrderId ? "PREPARED" : "PREPARING" : payment.status === "VOIDED" ? "REVIEW_REQUIRED" : payment.status;
	let clientId: string | undefined;
	try {
		const env = getPayPalEnv();
		if (env.PAYPAL_BUYER_APPROVAL_ENABLED === "true" && env.PAYPAL_WEBHOOK_ID && env.PAYPAL_CLIENT_ID === payment.paypalClientId
			&& ["PREPARED", "APPROVED"].includes(state)) clientId = env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
	} catch { /* Unconfigured checkout remains readable and cannot mount the SDK. */ }
	return { paymentId: payment.id, orderId: payment.paypalOrderId, state,
		amount: formatMoney(payment.amountMinor, payment.currency), buyerApprovalEnabled: Boolean(clientId),
		...(clientId ? { clientId } : {}),
		...(payment.captureStartedAt || payment.status !== "CREATED" ? { canCancel: false,
			captureId: payment.paypalCaptureId, capturedAt: payment.capturedAt?.toISOString() ?? null } : {}),
	};
}
