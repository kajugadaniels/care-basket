// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createPayPalClient } from "./client";

const config = { clientId: "fictional-sandbox-client", clientSecret: "fictional-sandbox-secret" };
const token = () => Response.json({ access_token: "fictional-token", token_type: "Bearer", expires_in: 120 });

describe("server-only Sandbox OAuth and bounded transport", () => {
	afterEach(() => vi.useRealTimers());
	it("deduplicates concurrent refreshes, caches the token, and expires it early", async () => {
		let now = 0;
		const send = vi.fn<typeof fetch>().mockImplementation(async (url) => String(url).endsWith("/token") ? token() : Response.json({ id: "ORDER1" }));
		const client = createPayPalClient(config, { fetch: send, now: () => now });
		await Promise.all([client.orderRequest("/v2/checkout/orders/ORDER1"), client.orderRequest("/v2/checkout/orders/ORDER2")]);
		expect(send.mock.calls.filter(([url]) => String(url).endsWith("/token"))).toHaveLength(1);
		await client.orderRequest("/v2/checkout/orders/ORDER1");
		expect(send).toHaveBeenCalledTimes(4);
		now = 61_000;
		await client.orderRequest("/v2/checkout/orders/ORDER1");
		expect(send.mock.calls.filter(([url]) => String(url).endsWith("/token"))).toHaveLength(2);
		const [url, init] = send.mock.calls[0];
		expect(url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
		expect(init).toMatchObject({ method: "POST", cache: "no-store", redirect: "error", body: "grant_type=client_credentials" });
		expect(new Headers(init?.headers).get("Authorization")).toBe(`Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`);
	});
	it("clears a failed refresh and never exposes raw authentication details", async () => {
		const send = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("secret provider diagnostics", { status: 401 }))
			.mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json({}));
		const client = createPayPalClient(config, { fetch: send });
		await expect(client.orderRequest("/v2/checkout/orders/ORDER1")).rejects.toMatchObject({ kind: "AUTHENTICATION", outcome: "NOT_CREATED" });
		await client.orderRequest("/v2/checkout/orders/ORDER1");
		expect(send).toHaveBeenCalledTimes(3);
	});
	it("sends the durable create key and representation header with the server OAuth token", async () => {
		const send = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json({}));
		await createPayPalClient(config, { fetch: send }).orderRequest("/v2/checkout/orders", { intent: "CAPTURE" }, "persistent-id");
		const [url, init] = send.mock.calls[1];
		expect(url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
		expect(init).toMatchObject({ method: "POST", cache: "no-store", redirect: "error", body: JSON.stringify({ intent: "CAPTURE" }) });
		const headers = new Headers(init?.headers);
		expect(headers.get("Authorization")).toBe("Bearer fictional-token");
		expect(headers.get("PayPal-Request-Id")).toBe("persistent-id");
		expect(headers.get("Prefer")).toBe("return=representation");
	});
	it.each<[number, string]>([[400, "NOT_CREATED"], [401, "NOT_CREATED"], [422, "NOT_CREATED"], [429, "UNKNOWN"], [500, "UNKNOWN"]])(
		"classifies HTTP %s without returning or logging provider diagnostics", async (status, outcome) => {
			const send = vi.fn<typeof fetch>().mockResolvedValueOnce(token())
				.mockResolvedValueOnce(new Response("private payer and credential diagnostics", { status }));
			const result = createPayPalClient(config, { fetch: send }).orderRequest("/v2/checkout/orders", {}, "persistent-id");
			await expect(result).rejects.toMatchObject({ outcome });
			await expect(result).rejects.not.toThrow(/private payer|credential diagnostics/);
			expect(send).toHaveBeenCalledTimes(2);
		});
	it("rejects malformed success JSON as an unknown create outcome", async () => {
		const send = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(new Response("not-json"));
		await expect(createPayPalClient(config, { fetch: send }).orderRequest("/v2/checkout/orders", {}, "persistent-id"))
			.rejects.toMatchObject({ kind: "INVALID_RESPONSE", outcome: "UNKNOWN" });
	});
	it("bounds OAuth timeouts without sending an order request", async () => {
		vi.useFakeTimers();
		const send = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
			init?.signal?.addEventListener("abort", () => reject(new Error("private transport detail")));
		}));
		const result = createPayPalClient(config, { fetch: send }).orderRequest("/v2/checkout/orders", {}, "persistent-id");
		const assertion = expect(result).rejects.toMatchObject({ kind: "UNAVAILABLE", outcome: "NOT_CREATED" });
		await vi.advanceTimersByTimeAsync(10_001);
		await assertion;
		expect(send).toHaveBeenCalledOnce();
	});
	it.each([{ access_token: "fake", token_type: "Other", expires_in: 120 }, { access_token: "", token_type: "Bearer", expires_in: 120 },
		{ access_token: "fake", token_type: "Bearer", expires_in: 0 }])("rejects invalid OAuth responses", async (body) => {
		const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json(body));
		await expect(createPayPalClient(config, { fetch: send }).orderRequest("/v2/checkout/orders"))
			.rejects.toMatchObject({ kind: "INVALID_RESPONSE", outcome: "NOT_CREATED" });
		expect(send).toHaveBeenCalledOnce();
	});
	it("bounds a timed-out POST, never retries automatically, and keeps its outcome unknown", async () => {
		vi.useFakeTimers();
		const send = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
			init?.signal?.addEventListener("abort", () => reject(new Error("secret transport diagnostics")));
		}));
		const call = createPayPalClient(config, { fetch: send }).orderRequest("/v2/checkout/orders", {}, "persistent-id");
		const assertion = expect(call).rejects.toMatchObject({ kind: "UNAVAILABLE", outcome: "UNKNOWN" });
		await vi.advanceTimersByTimeAsync(10_001);
		await assertion;
		expect(send).toHaveBeenCalledTimes(2);
	});
	it("rejects oversized or malformed bodies without retaining them", async () => {
		const send = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(new Response("x".repeat(128 * 1024 + 1)));
		await expect(createPayPalClient(config, { fetch: send }).orderRequest("/v2/checkout/orders", {}, "persistent-id"))
			.rejects.toMatchObject({ kind: "INVALID_RESPONSE", outcome: "UNKNOWN" });
	});
	it("pins Sandbox and cannot access capture, live URLs, or caller-selected hosts", async () => {
		const send = vi.fn<typeof fetch>();
		const client = createPayPalClient(config, { fetch: send });
		for (const path of ["https://api-m.paypal.com/v2/checkout/orders", "/v2/checkout/orders/ORDER1/capture", "/v1/payments"]) {
			await expect(client.orderRequest(path)).rejects.toMatchObject({ kind: "CONFIGURATION" });
		}
		expect(send).not.toHaveBeenCalled();
	});
	it("uses one stable capture request ID and never exposes generic POST paths", async () => {
		const send = vi.fn<typeof fetch>().mockResolvedValueOnce(token())
			.mockResolvedValueOnce(Response.json({ id: "ORDER1" })).mockResolvedValueOnce(Response.json({ id: "ORDER1" }));
		const client = createPayPalClient(config, { fetch: send });
		const paymentId = "0199a100-0000-7000-8000-000000000001";
		await client.captureOrder("ORDER1", paymentId); await client.captureOrder("ORDER1", paymentId);
		for (const [url, init] of send.mock.calls.slice(1)) {
			expect(url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER1/capture");
			expect(init).toMatchObject({ method: "POST", cache: "no-store", body: "{}" });
			expect(new Headers(init?.headers).get("PayPal-Request-Id")).toBe(`capture-${paymentId}`);
		}
		await expect(client.paymentRequest("https://evil.invalid")).rejects.toMatchObject({ kind: "CONFIGURATION" });
	});
	it.each(["INSTRUMENT_DECLINED", "ORDER_ALREADY_CAPTURED"] as const)("retains only the safe %s recovery code", async (issue) => {
		const send = vi.fn<typeof fetch>().mockResolvedValueOnce(token()).mockResolvedValueOnce(Response.json({
			details: [{ issue, description: "private payer details" }], debug_id: "private debug information",
		}, { status: 422 }));
		const result = createPayPalClient(config, { fetch: send }).captureOrder("ORDER1", "0199a100-0000-7000-8000-000000000001");
		await expect(result).rejects.toMatchObject({ issue });
		await expect(result).rejects.not.toThrow(/private payer|private debug/);
		expect(send).toHaveBeenCalledTimes(2);
	});
});
