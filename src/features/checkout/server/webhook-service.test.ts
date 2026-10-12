// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutDatabase } from "@/test/factories/checkout";
import { approvedOrder, paymentAttempt, paymentOrder } from "@/test/factories/payments";
import { requestNow } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ db: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: fake.db }));
vi.mock("@/lib/paypal/client", () => ({ getPayPalClient: fake.client }));
vi.mock("@/server/logger", () => ({ logSecurityFailure: vi.fn() }));
import { processVerifiedWebhook } from "./webhook-service";

const event = (type = "PAYMENT.CAPTURE.COMPLETED", id = "WH-FICTIONAL1") => ({ id, event_type: type,
	resource: { id: type === "CHECKOUT.ORDER.APPROVED" ? "ORDER1" : "CAPTURE1", supplementary_data: { related_ids: { order_id: "ORDER1" } },
		payee: { email_address: "never-persist@example.invalid" } } });
let database: ReturnType<typeof checkoutDatabase>;
let client: { clientId: string; orderRequest: ReturnType<typeof vi.fn>; paymentRequest: ReturnType<typeof vi.fn> };

describe("verified webhook reconciliation and replay", () => {
	beforeEach(() => {
		vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(requestNow);
		database = checkoutDatabase(); fake.db.mockReturnValue(database.db);
		database.state().status = "AWAITING_PAYMENT"; database.state().lockedAt = requestNow;
		database.state().payments.push(paymentAttempt());
		client = { clientId: "fictional-sandbox-client", orderRequest: vi.fn().mockResolvedValue(paymentOrder()), paymentRequest: vi.fn() };
		fake.client.mockReturnValue(client);
	});
	afterEach(() => vi.useRealTimers());
	it("confirms a completed capture through a fresh order lookup without payer data", async () => {
		await processVerifiedWebhook(event());
		expect(database.state().status).toBe("PAID");
		expect(client.orderRequest).toHaveBeenCalledWith("/v2/checkout/orders/ORDER1");
		expect(JSON.stringify(database.state().events)).not.toContain("never-persist");
	});
	it.each(["approval", "advanced"])("never marks paid from an %s approval event", async (kind) => {
		client.orderRequest.mockResolvedValue(kind === "approval" ? approvedOrder() : paymentOrder());
		await processVerifiedWebhook(event("CHECKOUT.ORDER.APPROVED"));
		expect(database.state().status).toBe("AWAITING_PAYMENT");
		expect(database.state().events[0].processedAt).not.toBeNull();
	});
	it("stops completed duplicates but resumes a failed unfinished delivery", async () => {
		client.orderRequest.mockRejectedValueOnce(new Error("private provider failure"));
		await expect(processVerifiedWebhook(event())).rejects.toThrow();
		expect(database.state().events[0].processedAt).toBeNull();
		await processVerifiedWebhook(event());
		await processVerifiedWebhook(event());
		expect(client.orderRequest).toHaveBeenCalledTimes(2);
		expect(database.state().events).toHaveLength(1);
		expect(database.state().audits).toEqual(["payment.captured"]);
	});
	it("handles concurrent duplicate notifications with one state audit", async () => {
		await Promise.all([processVerifiedWebhook(event()), processVerifiedWebhook(event())]);
		expect(database.state().events).toHaveLength(1);
		expect(database.state().audits).toEqual(["payment.captured"]);
	});
	it("stores unknown event types and unmatched orders without changing payment state", async () => {
		await processVerifiedWebhook({ id: "WH-UNKNOWN", event_type: "OTHER.EVENT", resource: { private: "not stored" } });
		await processVerifiedWebhook({ ...event(), resource: { id: "CAPTURE2", supplementary_data: { related_ids: { order_id: "OTHER" } } } });
		expect(database.state().events.map((row) => row.summary)).toEqual(["IGNORED", "UNMATCHED"]);
		expect(database.state().status).toBe("AWAITING_PAYMENT");
		expect(client.orderRequest).not.toHaveBeenCalled();
	});
	it.each([null, { id: "bad/id", event_type: "PAYMENT.CAPTURE.COMPLETED" },
		{ id: "WH-MALFORMED", event_type: "capture completed" }])("rejects a malformed signed envelope before recording metadata", async (body) => {
		await expect(processVerifiedWebhook(body)).rejects.toMatchObject({ status: 400 });
		expect(database.state().events).toHaveLength(0);
		expect(client.orderRequest).not.toHaveBeenCalled();
	});
	it.each(["custom", "capture", "client"])("rejects %s mismatch and leaves delivery retryable", async (scenario) => {
		const order = paymentOrder();
		if (scenario === "custom") order.purchase_units[0].custom_id = paymentAttempt().basketId;
		if (scenario === "capture") order.purchase_units[0].payments.captures[0].id = "OTHER";
		if (scenario === "client") client.clientId = "OTHER";
		client.orderRequest.mockResolvedValue(order);
		await expect(processVerifiedWebhook(event())).rejects.toThrow();
		expect(database.state().status).toBe("AWAITING_PAYMENT");
		expect(database.state().events[0].processedAt).toBeNull();
	});
	it("takes authoritative completed state over an older pending event", async () => {
		await processVerifiedWebhook(event("PAYMENT.CAPTURE.PENDING"));
		expect(database.state().status).toBe("PAID");
	});
	it.each(["PENDING", "DENIED", "DECLINED"])("reconciles verified %s without claiming payment or delivery", async (status) => {
		client.orderRequest.mockResolvedValue(paymentOrder(paymentAttempt(), status));
		await processVerifiedWebhook(event(`PAYMENT.CAPTURE.${status}`));
		expect(database.state().payments[0].status).toBe(status === "PENDING" ? "PENDING" : "DENIED");
		expect(database.state().status).toBe(status === "PENDING" ? "AWAITING_PAYMENT" : "PENDING_REVIEW");
		expect(Boolean(database.state().lockedAt)).toBe(status === "PENDING");
	});
	it("records a refund resource only after verifying its capture relationship", async () => {
		client.paymentRequest.mockResolvedValueOnce({ id: "CAPTURE1", status: "REFUNDED", amount: { currency_code: "USD", value: "5.00" },
			supplementary_data: { related_ids: { order_id: "ORDER1" } } })
			.mockResolvedValueOnce({ id: "REFUND1", status: "COMPLETED", amount: { currency_code: "USD", value: "5.00" },
				links: [{ rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE1" }] });
		await processVerifiedWebhook({ id: "WH-REFUND", event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: "REFUND1",
			supplementary_data: { related_ids: { order_id: "ORDER1", capture_id: "CAPTURE1" } } } });
		expect(database.state().payments[0].status).toBe("REFUNDED");
		expect(database.state().status).toBe("AWAITING_PAYMENT"); // No fabricated original completion.
		expect(client.paymentRequest).toHaveBeenCalledWith("/v2/payments/refunds/REFUND1");
	});
	it("records a verified reversal and ignores later capture completion", async () => {
		client.paymentRequest.mockResolvedValue({ id: "CAPTURE1", status: "REFUNDED", amount: { currency_code: "USD", value: "5.00" },
			supplementary_data: { related_ids: { order_id: "ORDER1" } } });
		await processVerifiedWebhook(event("PAYMENT.CAPTURE.REVERSED"));
		await processVerifiedWebhook(event("PAYMENT.CAPTURE.COMPLETED", "WH-LATE"));
		expect(database.state().payments[0].status).toBe("REVERSED");
		expect(database.state().lockedAt).not.toBeNull();
	});
	it("verifies reversal refund resources and does not let a late refund hide remote reversal", async () => {
		client.paymentRequest.mockImplementation(async (path: string) => path.includes("/refunds/")
			? { id: "REFUND1", status: "COMPLETED", amount: { currency_code: "USD", value: "1.00" },
				links: [{ rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE1" }] }
			: { id: "CAPTURE1", status: "REVERSED", amount: { currency_code: "USD", value: "5.00" },
				supplementary_data: { related_ids: { order_id: "ORDER1" } } });
		const resource = { id: "REFUND1", links: [{ rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE1" }] };
		await processVerifiedWebhook({ id: "WH-REVERSE", event_type: "PAYMENT.CAPTURE.REVERSED", resource });
		await processVerifiedWebhook({ id: "WH-LATE-REFUND", event_type: "PAYMENT.CAPTURE.REFUNDED", resource });
		expect(client.paymentRequest).toHaveBeenCalledWith("/v2/payments/refunds/REFUND1");
		expect(database.state().payments[0].status).toBe("REVERSED");
	});
});
