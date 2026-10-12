import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { processVerifiedWebhook } from "@/features/checkout/server/webhook-service";
import { readWebhookBody, verifyWebhookSignature, WebhookInputError } from "@/lib/paypal/webhooks";
import { logSecurityFailure } from "@/server/logger";

// Permit the bounded verification/lookups to finish; no network call holds a DB lock.
export const maxDuration = 90;

export async function POST(request: Request) {
	let verified = false;
	try {
		const original = await readWebhookBody(request);
		await verifyWebhookSignature(request, original);
		verified = true;
		const requestId = await processVerifiedWebhook(original);
		if (requestId) {
			for (const path of ["/family", "/family/requests", `/family/requests/${requestId}`, "/shop/requests", `/shop/requests/${requestId}`]) {
				revalidatePath(path);
			}
		}
		return Response.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
	} catch (error) {
		const status = error instanceof WebhookInputError ? error.status : 503;
		logSecurityFailure({ event: verified ? "webhook.processing_failed" : "webhook.verification_failed",
			requestId: randomUUID(), actorType: "SYSTEM", code: status === 503 ? "PAYMENT_PROVIDER_ERROR" : "VALIDATION_FAILED" });
		return Response.json({ error: status === 503 ? "Notification processing unavailable. Please retry." : "Invalid notification." },
			{ status, headers: { "Cache-Control": "no-store", ...(status === 503 ? { "Retry-After": "30" } : {}) } });
	}
}
