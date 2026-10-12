// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ env: vi.fn(), client: vi.fn(), verify: vi.fn(), process: vi.fn(), revalidate: vi.fn(), log: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: fake.revalidate }));
vi.mock("@/server/logger", () => ({ logSecurityFailure: fake.log }));
vi.mock("@/lib/env/server", () => ({ getPayPalEnv: fake.env }));
vi.mock("@/lib/paypal/client", () => ({ getPayPalClient: fake.client }));
vi.mock("@/features/checkout/server/webhook-service", () => ({ processVerifiedWebhook: fake.process }));
import * as paypalRoute from "./route";

const { POST } = paypalRoute;

function notification(body: unknown = { id: "WH-FICTIONAL1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { payer: "must remain in signature input only" } }) {
	return new Request("https://carebasket.invalid/api/webhooks/paypal", { method: "POST", body: JSON.stringify(body), headers: {
		"content-type": "application/json", "paypal-auth-algo": "SHA256withRSA",
		"paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-FICTIONAL",
		"paypal-transmission-id": "FICTIONAL-TRANSMISSION", "paypal-transmission-sig": "QUJDREVGR0hJSktMTU5PUFFSU1Q=",
		"paypal-transmission-time": "2026-10-12T00:00:00Z",
	} });
}

describe("public signed PayPal webhook boundary", () => {
	beforeEach(() => {
		vi.resetAllMocks(); fake.env.mockReturnValue({ PAYPAL_WEBHOOK_ID: "WEBHOOK1" });
		fake.client.mockReturnValue({ verifyWebhook: fake.verify });
		fake.verify.mockResolvedValue({ verification_status: "SUCCESS" }); fake.process.mockResolvedValue(null);
	});
	it("uses the default Node runtime without a Cache Components-incompatible override", () => {
		expect(paypalRoute).not.toHaveProperty("runtime");
		expect(paypalRoute.maxDuration).toBe(90);
	});
	it("verifies the unmodified event before processing without Clerk/device/Origin authentication", async () => {
		const request = notification(); const original = await request.clone().json();
		const response = await POST(request);
		expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
		expect(fake.verify).toHaveBeenCalledWith(expect.objectContaining({ webhook_id: "WEBHOOK1", webhook_event: original }));
		expect(fake.verify.mock.invocationCallOrder[0]).toBeLessThan(fake.process.mock.invocationCallOrder[0]);
	});
	it("rejects invalid signatures before any business writes", async () => {
		fake.verify.mockResolvedValue({ verification_status: "FAILURE" });
		expect((await POST(notification())).status).toBe(400);
		expect(fake.process).not.toHaveBeenCalled();
	});
	it.each(["auth-algo", "cert-url", "transmission-id", "transmission-sig", "transmission-time"])("rejects missing %s before provider calls", async (header) => {
		const request = notification(); request.headers.delete(`paypal-${header}`);
		const response = await POST(request);
		expect(response.status).toBe(400); expect(response.headers.get("cache-control")).toBe("no-store");
		expect(fake.verify).not.toHaveBeenCalled(); expect(fake.process).not.toHaveBeenCalled();
	});
	it("fails closed on missing webhook configuration, without leaking details", async () => {
		fake.env.mockReturnValue({});
		const response = await POST(notification());
		expect(response.status).toBe(503); expect(fake.verify).not.toHaveBeenCalled(); expect(fake.process).not.toHaveBeenCalled();
	});
	it.each([
		["auth-algo", "none"], ["cert-url", "https://paypal.com.evil.invalid/cert"],
		["transmission-id", "../capture"], ["transmission-sig", "not base64!"], ["transmission-time", "yesterday"],
	])("rejects malformed %s without provider or business calls", async (header, value) => {
		const request = notification(); request.headers.set(`paypal-${header}`, value);
		expect((await POST(request)).status).toBe(400);
		expect(fake.verify).not.toHaveBeenCalled(); expect(fake.process).not.toHaveBeenCalled();
	});
	it.each(["signature-service", "database"])("returns retriable non-2xx for %s failure", async (stage) => {
		(stage === "signature-service" ? fake.verify : fake.process).mockRejectedValue(new Error("private credential diagnostics"));
		const response = await POST(notification());
		expect(response.status).toBe(503); expect(response.headers.get("retry-after")).toBe("30");
		expect(await response.text()).not.toContain("private credential");
		expect(JSON.stringify(fake.log.mock.calls)).not.toContain("private credential");
	});
	it("rejects malformed JSON without contacting PayPal", async () => {
		const response = await POST(new Request("https://carebasket.invalid/api/webhooks/paypal", {
			method: "POST", headers: { "content-type": "application/json" }, body: "{bad json",
		}));
		expect(response.status).toBe(400); expect(fake.verify).not.toHaveBeenCalled();
	});
	it.each(["declared", "streamed"])("rejects %s bodies above 64 KB before signature verification", async (kind) => {
		const request = notification({ private: "x".repeat(64 * 1024) });
		if (kind === "declared") request.headers.set("content-length", "70000");
		expect((await POST(request)).status).toBe(413); expect(fake.verify).not.toHaveBeenCalled();
	});
	it("invalidates both audiences only after durable reconciliation", async () => {
		fake.process.mockResolvedValue("0199a100-0000-7000-8000-000000000001");
		expect((await POST(notification())).status).toBe(200);
		expect(fake.revalidate).toHaveBeenCalledWith("/family/requests"); expect(fake.revalidate).toHaveBeenCalledWith("/shop/requests");
	});
});
