// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutDatabase } from "@/test/factories/checkout";
import { approvedOrder, paymentAttempt, paymentOrder } from "@/test/factories/payments";
import { requestIds, requestManager, requestNow, requester } from "@/test/factories/requests";
import { PayPalError } from "@/lib/paypal/errors";
const fake = vi.hoisted(() => ({ db: vi.fn(), client: vi.fn(), env: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: fake.db }));
vi.mock("@/lib/paypal/client", () => ({ getPayPalClient: fake.client }));
vi.mock("@/lib/env/server", () => ({ getPayPalEnv: fake.env }));
import { reconcileCheckout } from "./capture-service";
import { cancelCheckout, getCheckout } from "./service";
import { commitVerifiedPayment } from "./confirmation-repository";

const input = { requestId: requestIds.request, paypalOrderId: "ORDER1" };
let database: ReturnType<typeof checkoutDatabase>;
let client: { clientId: string; orderRequest: ReturnType<typeof vi.fn>; captureOrder: ReturnType<typeof vi.fn> };

describe("durable capture and uncertain-outcome recovery", () => {
	beforeEach(() => {
		vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(requestNow);
		database = checkoutDatabase(); fake.db.mockReturnValue(database.db);
		database.state().status = "AWAITING_PAYMENT"; database.state().lockedAt = requestNow;
		database.state().payments.push(paymentAttempt());
		client = { clientId: "fictional-sandbox-client", orderRequest: vi.fn().mockResolvedValue(approvedOrder()), captureOrder: vi.fn().mockResolvedValue(paymentOrder()) };
		fake.client.mockReturnValue(client);
		fake.env.mockReturnValue({ PAYPAL_BUYER_APPROVAL_ENABLED: "true", PAYPAL_WEBHOOK_ID: "WEBHOOK1",
			PAYPAL_CLIENT_ID: client.clientId, NEXT_PUBLIC_PAYPAL_CLIENT_ID: client.clientId });
	});
	afterEach(() => vi.useRealTimers());
	it.each(["OWNER", "MANAGER"] as const)("allows %s and atomically confirms capture, request, event and audit without fulfillment", async (role) => {
		client.captureOrder.mockImplementation(async () => { expect(database.inTransaction()).toBe(false); return paymentOrder(); });
		const result = await reconcileCheckout({ ...requestManager, role }, input, true);
		expect(result).toMatchObject({ state: "CAPTURED", captureId: "CAPTURE1", amount: "$5.00", buyerApprovalEnabled: false });
		expect(database.state()).toMatchObject({ status: "PAID", lockedAt: requestNow });
		expect(database.state().events).toHaveLength(1);
		expect(database.state().audits).toEqual(["payment.capture_started", "payment.captured"]);
		expect(JSON.stringify(database.db.shoppingRequest.updateMany.mock.calls)).not.toContain("fulfillmentStatus");
	});
	it("returns an already captured payment without calling PayPal", async () => {
		database.state().payments[0] = paymentAttempt({ status: "CAPTURED", paypalCaptureId: "CAPTURE1", capturedAt: requestNow });
		expect((await reconcileCheckout(requestManager, input, true)).state).toBe("CAPTURED");
		expect(fake.client).not.toHaveBeenCalled();
	});
	it("rejects device/null/forged roles before persistence", async () => {
		for (const actor of [requester, null, { ...requestManager, role: "VIEWER" }]) {
			await expect(Reflect.apply(reconcileCheckout, undefined, [actor, input, true])).rejects.toMatchObject({ code: "FORBIDDEN" });
		}
		expect(fake.db).not.toHaveBeenCalled();
	});
	it("rejects foreign families and different order IDs", async () => {
		await expect(reconcileCheckout({ ...requestManager, familyId: requestIds.other }, input, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(reconcileCheckout(requestManager, { ...input, paypalOrderId: "OTHER" }, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(client.captureOrder).not.toHaveBeenCalled();
	});
	it.each(["disabled", "binding", "unlocked", "declined", "amount"])("refuses %s capture before provider calls", async (scenario) => {
		if (scenario === "disabled") fake.env.mockReturnValue({ PAYPAL_BUYER_APPROVAL_ENABLED: "false" });
		if (scenario === "binding") database.state().payments[0].paypalClientId = "OTHER";
		if (scenario === "unlocked") database.state().lockedAt = null;
		if (scenario === "declined") database.state().status = "DECLINED";
		if (scenario === "amount") database.state().subtotalMinor = 1;
		await expect(reconcileCheckout(requestManager, input, true)).rejects.toThrow();
		expect(client.orderRequest).not.toHaveBeenCalled(); expect(client.captureOrder).not.toHaveBeenCalled();
	});
	it("keeps pending capture locked, and refreshes it without another capture POST", async () => {
		client.captureOrder.mockResolvedValue(paymentOrder(paymentAttempt(), "PENDING"));
		expect((await reconcileCheckout(requestManager, input, true)).state).toBe("PENDING");
		expect(database.state().status).toBe("AWAITING_PAYMENT");
		client.orderRequest.mockResolvedValue(paymentOrder());
		expect((await reconcileCheckout(requestManager, input)).state).toBe("CAPTURED");
		expect(client.captureOrder).toHaveBeenCalledOnce();
	});
	it("refreshes an unapproved order without capture or unlocking", async () => {
		const order = approvedOrder(); order.status = "CREATED";
		client.orderRequest.mockResolvedValue(order);
		expect((await reconcileCheckout(requestManager, input)).state).toBe("PREPARED");
		expect(client.captureOrder).not.toHaveBeenCalled();
		expect(database.state().payments[0].captureStartedAt).toBeNull();
		await expect(reconcileCheckout(requestManager, input, true)).rejects.toMatchObject({ reason: "RECONCILIATION" });
		expect(client.captureOrder).not.toHaveBeenCalled();
		expect(database.state().lockedAt).not.toBeNull();
	});
	it("keeps a timeout unknown/locked and reuses the same payment key after lookup", async () => {
		client.captureOrder.mockRejectedValueOnce(new PayPalError("UNAVAILABLE"));
		await expect(reconcileCheckout(requestManager, input, true)).rejects.toMatchObject({ reason: "UNKNOWN" });
		expect(database.state()).toMatchObject({ status: "AWAITING_PAYMENT", lockedAt: requestNow });
		expect(database.state().payments[0].captureStartedAt).toEqual(requestNow);
		await reconcileCheckout(requestManager, input, true);
		expect(client.captureOrder.mock.calls).toEqual([["ORDER1", requestIds.key], ["ORDER1", requestIds.key]]);
		expect(client.orderRequest).toHaveBeenCalledTimes(2);
	});
	it("never replays capture beyond retention, but still permits a successful lookup", async () => {
		database.state().payments[0].captureStartedAt = new Date(requestNow.getTime() - 6 * 60 * 60_000);
		await expect(reconcileCheckout(requestManager, input, true)).rejects.toMatchObject({ reason: "RECONCILIATION" });
		expect(client.captureOrder).not.toHaveBeenCalled();
		client.orderRequest.mockResolvedValue(paymentOrder());
		expect((await reconcileCheckout(requestManager, input, true)).state).toBe("CAPTURED");
	});
	it("hides approval for expired attempts while keeping database-only status readable", async () => {
		database.state().payments[0].status = "APPROVED";
		database.state().payments[0].captureStartedAt = new Date(requestNow.getTime() - 6 * 60 * 60_000);
		expect(await getCheckout(requestManager, input.requestId)).toMatchObject({ state: "REVIEW_REQUIRED", buyerApprovalEnabled: false, canCancel: false });
		expect(client.orderRequest).not.toHaveBeenCalled();
	});
	it("allows one capture worker across simultaneous managers", async () => {
		let complete: (order: ReturnType<typeof paymentOrder>) => void = () => {};
		client.captureOrder.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
		const first = reconcileCheckout(requestManager, input, true);
		await vi.waitFor(() => expect(client.captureOrder).toHaveBeenCalledOnce());
		await expect(reconcileCheckout(requestManager, input, true)).rejects.toMatchObject({ reason: "IN_PROGRESS" });
		complete(paymentOrder()); await first;
		expect(database.state().events).toHaveLength(1);
	});
	it("recovers an expired lease through lookup before considering capture", async () => {
		database.state().payments[0].operationToken = requestIds.other;
		database.state().payments[0].operationExpiresAt = new Date(requestNow.getTime() - 1);
		database.state().payments[0].captureStartedAt = new Date(requestNow.getTime() - 90_000);
		client.orderRequest.mockResolvedValue(paymentOrder());
		expect((await reconcileCheckout(requestManager, input, true)).state).toBe("CAPTURED");
		expect(client.captureOrder).not.toHaveBeenCalled();
	});
	it("refuses cancellation after capture started even when the lease expired", async () => {
		database.state().payments[0].captureStartedAt = requestNow;
		database.state().payments[0].operationExpiresAt = new Date(requestNow.getTime() - 1);
		await expect(cancelCheckout(requestManager, { requestId: input.requestId, paymentId: requestIds.key, revision: 0, confirmed: true }))
			.rejects.toMatchObject({ code: "CONFLICT" });
		expect(database.state().lockedAt).toEqual(requestNow);
	});
	it("reconciles ORDER_ALREADY_CAPTURED rather than trusting the error", async () => {
		client.captureOrder.mockRejectedValueOnce(new PayPalError("REJECTED", "UNKNOWN", "ORDER_ALREADY_CAPTURED"));
		client.orderRequest.mockResolvedValueOnce(approvedOrder()).mockResolvedValueOnce(paymentOrder());
		expect((await reconcileCheckout(requestManager, input, true)).state).toBe("CAPTURED");
	});
	it("keeps a funding decline on the same approved attempt", async () => {
		client.captureOrder.mockRejectedValue(new PayPalError("REJECTED", "UNKNOWN", "INSTRUMENT_DECLINED"));
		await expect(reconcileCheckout(requestManager, input, true)).rejects.toMatchObject({ reason: "FUNDING" });
		expect(database.state().payments).toHaveLength(1);
		expect(database.state().payments[0].status).toBe("APPROVED");
		expect(database.state().lockedAt).not.toBeNull();
	});
	it("returns the webhook winner when the worker later times out", async () => {
		client.captureOrder.mockImplementation(async () => {
			await commitVerifiedPayment(database.state().payments[0], { status: "CAPTURED", captureId: "CAPTURE1", capturedAt: requestNow },
				{ source: "SYSTEM", eventType: "WEBHOOK_WINNER" }, { type: "system" });
			throw new PayPalError("UNAVAILABLE");
		});
		expect((await reconcileCheckout(requestManager, input, true)).state).toBe("CAPTURED");
		expect(database.state().audits.filter((action) => action === "payment.captured")).toHaveLength(1);
	});
	it("rolls back payment/request/event together when confirmation audit fails; GET recovery succeeds", async () => {
		database.db.auditLog.create.mockImplementationOnce(async () => ({ id: requestIds.other })).mockRejectedValueOnce(new Error("private audit diagnostics"));
		await expect(reconcileCheckout(requestManager, input, true)).rejects.toMatchObject({ reason: "UNKNOWN" });
		expect(database.state().status).toBe("AWAITING_PAYMENT"); expect(database.state().events).toHaveLength(0);
		client.orderRequest.mockResolvedValue(paymentOrder());
		expect((await reconcileCheckout(requestManager, input)).state).toBe("CAPTURED");
		expect(client.captureOrder).toHaveBeenCalledOnce();
	});
});
