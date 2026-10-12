import "server-only";
import { getPayPalEnv } from "@/lib/env/server";
import { getPayPalClient } from "@/lib/paypal/client";
import { readVerifiedPayment, verifyPayment } from "@/lib/paypal/capture";
import { PayPalError } from "@/lib/paypal/errors";
import type { AdultActor } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import { captureCheckoutSchema } from "../schemas";
import { checkoutDto } from "./checkout-dto";
import { claimCapture, readCapturePayment, releaseCapture } from "./capture-repository";
import { commitVerifiedPayment } from "./confirmation-repository";
import { CheckoutFailure } from "./failure";
import { CAPTURE_REPLAY_WINDOW_MS } from "./persistence";

export async function reconcileCheckout(actor: AdultActor, value: unknown, capture = false) {
	if (!actor || actor.type !== "adult" || !["OWNER", "MANAGER"].includes(actor.role)) throw new AppError("FORBIDDEN");
	const input = captureCheckoutSchema.parse(value);
	const existing = await readCapturePayment(actor, input);
	if (!existing) throw new AppError("NOT_FOUND");
	if (["CAPTURED", "REFUNDED", "REVERSED", "DENIED"].includes(existing.status)) return checkoutDto(existing);
	let client: ReturnType<typeof getPayPalClient>;
	try {
		const env = getPayPalEnv();
		if (capture && (env.PAYPAL_BUYER_APPROVAL_ENABLED !== "true" || !env.PAYPAL_WEBHOOK_ID)) throw new Error("Approval disabled.");
		client = getPayPalClient();
	} catch { throw new CheckoutFailure("CONFIGURATION"); }
	const { payment, token } = await claimCapture(actor, input, client.clientId, capture);
	if (!token) return checkoutDto(payment);
	try {
		// Always reconcile first, including crashed/expired workers and unknown previous calls.
		let verified = await readVerifiedPayment(client, payment);
		if (capture && verified.status === "CREATED") throw new CheckoutFailure("RECONCILIATION");
		if (capture && verified.status === "APPROVED") {
			if (!payment.captureStartedAt || Date.now() - payment.captureStartedAt.getTime() >= CAPTURE_REPLAY_WINDOW_MS) {
				throw new CheckoutFailure("RECONCILIATION");
			}
			try { verified = verifyPayment(await client.captureOrder(input.paypalOrderId, payment.id), payment); }
			catch (error) {
				if (error instanceof PayPalError && error.issue === "ORDER_ALREADY_CAPTURED") verified = await readVerifiedPayment(client, payment);
				else if (error instanceof PayPalError && error.issue === "INSTRUMENT_DECLINED") {
					// Keep the same attempt; another funding source requires deliberate buyer action.
					const current = await readVerifiedPayment(client, payment);
					if (current.status !== "APPROVED") verified = current;
					else {
						await commitVerifiedPayment(payment, current, { source: "SYSTEM", eventType: "FUNDING_DECLINED" }, actor, token);
						throw new CheckoutFailure("FUNDING");
					}
				} else throw error;
			}
			if (verified.status === "APPROVED") throw new CheckoutFailure("UNKNOWN");
		}
		return checkoutDto(await commitVerifiedPayment(payment, verified,
			{ source: capture ? "CAPTURE_RESPONSE" : "SYSTEM", eventType: capture ? "CAPTURE_RESULT" : "STATUS_REFRESH",
				...(verified.captureId ? { resourceId: verified.captureId } : {}) }, actor, token));
	} catch (error) {
		await releaseCapture(actor, input, token, error instanceof PayPalError && error.kind === "INVALID_RESPONSE");
		// A webhook may have committed while the network response failed or the worker lost its fence.
		const winner = await readCapturePayment(actor, input);
		if (winner && ["CAPTURED", "REFUNDED", "REVERSED"].includes(winner.status)) return checkoutDto(winner);
		if (error instanceof CheckoutFailure || error instanceof AppError) throw error;
		throw new CheckoutFailure("UNKNOWN");
	}
}
