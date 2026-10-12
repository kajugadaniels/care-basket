import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getPayPalEnv } from "@/lib/env/server";
import { PayPalError } from "@/lib/paypal/errors";

const SANDBOX_URL = "https://api-m.sandbox.paypal.com";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 128 * 1024;
const tokenSchema = z.object({ access_token: z.string().min(1).max(16_000),
	token_type: z.literal("Bearer"), expires_in: z.int().min(1).max(86_400) });

type Configuration = { clientId: string; clientSecret: string };
type Dependencies = { fetch?: typeof fetch; now?: () => number };

async function boundedJson(response: Response): Promise<unknown> {
	if (!response.body) throw new PayPalError("INVALID_RESPONSE");
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_RESPONSE_BYTES) throw new PayPalError("INVALID_RESPONSE");
			chunks.push(value);
		}
		return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
	} catch {
		await reader.cancel().catch(() => undefined);
		throw new PayPalError("INVALID_RESPONSE");
	} finally { reader.releaseLock(); }
}

export function createPayPalClient(config: Configuration, dependencies: Dependencies = {}) {
	const send = dependencies.fetch ?? fetch;
	const now = dependencies.now ?? Date.now;
	let cachedToken: { value: string; expiresAt: number } | undefined;
	let refreshing: Promise<string> | undefined;

	async function request(path: string, init: RequestInit, isOAuth = false): Promise<unknown> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		try {
			const response = await send(`${SANDBOX_URL}${path}`, { ...init,
				cache: "no-store", redirect: "error", signal: controller.signal });
			if (!response.ok || ![200, 201].includes(response.status)) {
				// Retain only two documented recovery codes; discard every free-text detail.
				const diagnostic = await boundedJson(response).catch(() => null);
				const issues = z.object({ details: z.array(z.object({ issue: z.string() })).max(20) }).safeParse(diagnostic);
				const code = issues.success ? issues.data.details[0]?.issue : undefined;
				const issue = code === "INSTRUMENT_DECLINED" || code === "ORDER_ALREADY_CAPTURED" ? code : undefined;
				const rejected = [400, 401, 403, 422].includes(response.status);
				// Only an explicit rejection of this POST proves this call created no order.
				throw new PayPalError([401, 403].includes(response.status) ? "AUTHENTICATION"
					: rejected ? "REJECTED" : "UNAVAILABLE", isOAuth || rejected ? "NOT_CREATED" : "UNKNOWN", issue);
			}
			return await boundedJson(response);
		} catch (error) {
			if (isOAuth) throw new PayPalError(error instanceof PayPalError ? error.kind : "UNAVAILABLE", "NOT_CREATED");
			if (error instanceof PayPalError) throw error;
			throw new PayPalError("UNAVAILABLE");
		} finally { clearTimeout(timer); }
	}

	async function refreshToken(): Promise<string> {
		const startedAt = now();
		const response = await request("/v1/oauth2/token", {
			method: "POST",
			headers: { Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
				"Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
			body: "grant_type=client_credentials",
		}, true);
		const token = tokenSchema.safeParse(response);
		if (!token.success) throw new PayPalError("INVALID_RESPONSE", "NOT_CREATED");
		const lifetime = token.data.expires_in * 1000;
		cachedToken = { value: token.data.access_token, expiresAt: startedAt + lifetime - Math.min(60_000, lifetime / 2) };
		return cachedToken.value;
	}

	async function accessToken() {
		if (cachedToken && cachedToken.expiresAt > now()) return cachedToken.value;
		// One refresh promise per instance. Failure clears it so later attempts can recover.
		const pending = refreshing ??= refreshToken();
		try { return await pending; }
		finally { if (refreshing === pending) refreshing = undefined; }
	}

	async function authorized(path: string, body?: unknown, requestId?: string) {
		const token = await accessToken();
		try {
			return await request(path, { method: body === undefined ? "GET" : "POST",
				headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json",
					Prefer: "return=representation", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
			});
		} catch (error) {
			if (error instanceof PayPalError && error.kind === "AUTHENTICATION") cachedToken = undefined;
			throw error; // No automatic POST retries; the durable service owns recovery.
		}
	}

	return {
		clientId: config.clientId,
		async orderRequest(path: string, body?: unknown, requestId?: string): Promise<unknown> {
			if (!/^\/v2\/checkout\/orders(?:\/[A-Z0-9]{1,36})?$/.test(path)) throw new PayPalError("CONFIGURATION", "NOT_CREATED");
			if (body !== undefined && (path !== "/v2/checkout/orders" || !requestId)) throw new PayPalError("CONFIGURATION", "NOT_CREATED");
			return authorized(path, body, requestId);
		},
		async captureOrder(orderId: string, paymentId: string) {
			if (!/^[A-Z0-9]{1,36}$/.test(orderId) || !z.uuid().safeParse(paymentId).success) throw new PayPalError("CONFIGURATION");
			return authorized(`/v2/checkout/orders/${orderId}/capture`, {}, `capture-${paymentId}`);
		},
		async paymentRequest(path: string) {
			if (!/^\/v2\/payments\/(captures|refunds)\/[A-Z0-9]{1,36}$/.test(path)) throw new PayPalError("CONFIGURATION");
			return authorized(path);
		},
		async verifyWebhook(body: unknown) {
			return authorized("/v1/notifications/verify-webhook-signature", body);
		},
	};
}

export type PayPalClient = ReturnType<typeof createPayPalClient>;

// Explicit exception to shared-cache restrictions: OAuth only, no family/payment data.
let instance: { fingerprint: string; client: PayPalClient } | undefined;
export function getPayPalClient(): PayPalClient {
	let env: ReturnType<typeof getPayPalEnv>;
	try { env = getPayPalEnv(); } catch { throw new PayPalError("CONFIGURATION", "NOT_CREATED"); }
	const fingerprint = createHash("sha256").update(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).digest("hex");
	if (!instance || instance.fingerprint !== fingerprint) {
		instance = { fingerprint, client: createPayPalClient({ clientId: env.PAYPAL_CLIENT_ID, clientSecret: env.PAYPAL_CLIENT_SECRET }) };
	}
	return instance.client;
}
