import "server-only";
import { z } from "zod";
import { getPayPalEnv } from "@/lib/env/server";
import { getPayPalClient } from "./client";
import { PayPalError } from "./errors";

export class WebhookInputError extends Error {
	constructor(readonly status: 400 | 413) { super("Invalid PayPal notification."); }
}

const headerSchema = z.object({
	auth_algo: z.literal("SHA256withRSA"),
	cert_url: z.string().max(500).regex(/^https:\/\/api(?:-m)?\.(?:sandbox\.)?paypal\.com\/v1\/notifications\/certs\/[A-Za-z0-9_-]+$/),
	transmission_id: z.string().min(1).max(100).regex(/^[A-Za-z0-9-]+$/),
	transmission_sig: z.string().min(20).max(500).regex(/^[A-Za-z0-9+/=]+$/),
	transmission_time: z.iso.datetime({ offset: true }).max(100),
});

export async function readWebhookBody(request: Request): Promise<unknown> {
	const limit = 64 * 1024;
	const length = request.headers.get("content-length");
	if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new WebhookInputError(413);
	if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") ?? "") || !request.body) throw new WebhookInputError(400);
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			bytes += value.byteLength;
			if (bytes > limit) throw new WebhookInputError(413);
			chunks.push(value);
		}
		return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown;
	} catch (error) {
		await reader.cancel().catch(() => undefined);
		throw error instanceof WebhookInputError ? error : new WebhookInputError(400);
	} finally { reader.releaseLock(); }
}

export async function verifyWebhookSignature(request: Request, originalEvent: unknown) {
	const parsed = headerSchema.safeParse(Object.fromEntries([
		"auth_algo", "cert_url", "transmission_id", "transmission_sig", "transmission_time",
	].map((key) => [key, request.headers.get(`paypal-${key.replaceAll("_", "-")}`)])));
	if (!parsed.success) throw new WebhookInputError(400);
	let webhookId: string | undefined;
	try { webhookId = getPayPalEnv().PAYPAL_WEBHOOK_ID; } catch { throw new PayPalError("CONFIGURATION"); }
	if (!webhookId) throw new PayPalError("CONFIGURATION");
	// Do not pass a stripped Zod projection: verification needs the original parsed event.
	const response = z.object({ verification_status: z.enum(["SUCCESS", "FAILURE"]) }).safeParse(
		await getPayPalClient().verifyWebhook({ ...parsed.data, webhook_id: webhookId, webhook_event: originalEvent }));
	if (!response.success) throw new PayPalError("INVALID_RESPONSE");
	if (response.data.verification_status !== "SUCCESS") throw new WebhookInputError(400);
}
