// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutDatabase } from "@/test/factories/checkout";
import { requestIds, requestManager, requestNow, requester } from "@/test/factories/requests";
import { PayPalError } from "@/lib/paypal/errors";
const fake = vi.hoisted(() => ({ database: vi.fn(), client: vi.fn(), create: vi.fn(), read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: fake.database }));
vi.mock("@/lib/paypal/client", () => ({ getPayPalClient: fake.client }));
vi.mock("@/lib/paypal/orders", async (original) => ({ ...await original<typeof import("@/lib/paypal/orders")>(),
	createSandboxOrder: fake.create, readSandboxOrder: fake.read }));
import { cancelCheckout, getCheckout, startCheckout } from "./service";
import { claimAttempt, savePreparedOrder } from "./attempt-repository";
import { reserveCheckout } from "./repository";
import { closeRequest, editRequestItem } from "@/features/requests/server/mutation-repository";

const input = { requestId: requestIds.request, revision: 0 };
let database: ReturnType<typeof checkoutDatabase>;
const sandboxOrder = { id: "ORDER1", status: "CREATED", hasPayments: false };
function cancellation() {
	return { requestId: requestIds.request, revision: database.state().revision,
		paymentId: database.state().payments[0].id, confirmed: true };
}

describe("checkout locking, recovery and safe cancellation", () => {
	beforeEach(() => {
		vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(requestNow);
		database = checkoutDatabase(); fake.database.mockReturnValue(database.db);
		fake.client.mockReturnValue({ clientId: "fictional-sandbox-client", orderRequest: vi.fn() });
		fake.create.mockImplementation(async () => {
			expect(database.state().status).toBe("AWAITING_PAYMENT");
			expect(database.state().lockedAt).not.toBeNull();
			return sandboxOrder;
		});
		fake.read.mockResolvedValue(sandboxOrder);
	});
	afterEach(() => vi.useRealTimers());

	it.each(["OWNER", "MANAGER"] as const)("allows %s to prepare but never pay or capture", async (role) => {
		fake.create.mockImplementationOnce(async () => {
			expect(database.inTransaction()).toBe(false);
			expect(database.state().payments).toHaveLength(1);
			return sandboxOrder;
		});
		const result = await startCheckout({ ...requestManager, role }, input);
		expect(result).toEqual({ paymentId: database.state().payments[0].id, orderId: "ORDER1", state: "PREPARED", amount: "$5.00", buyerApprovalEnabled: false });
		expect(database.state()).toMatchObject({ revision: 1, status: "AWAITING_PAYMENT", subtotalMinor: 500 });
		expect(database.state().payments[0]).toMatchObject({ status: "CREATED", paypalOrderId: "ORDER1", operationToken: null });
		expect(database.state().audits).toEqual(["checkout.started", "checkout.order_created"]);
		expect(fake.create.mock.calls[0][1]).toMatchObject({ paymentId: result.paymentId, amountMinor: 500, currency: "USD",
			items: [{ sku: "demo-milk", name: "Milk · 1 litre", quantity: 2, unitPriceMinor: 250 }] });
		expect(database.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 5000, timeout: 15000 });
	});
	it("rejects device, unauthenticated, and invalid role actors before touching persistence", async () => {
		// Deliberately cross the runtime boundary without weakening production actor types.
		for (const actor of [requester, null, { ...requestManager, role: "GUEST" }]) {
			await expect(Reflect.apply(startCheckout, undefined, [actor, input])).rejects.toMatchObject({ code: "FORBIDDEN" });
			await expect(Reflect.apply(cancelCheckout, undefined, [actor, { ...input, paymentId: requestIds.key, confirmed: true }]))
				.rejects.toMatchObject({ code: "FORBIDDEN" });
		}
		expect(fake.database).not.toHaveBeenCalled(); expect(fake.client).not.toHaveBeenCalled();
	});
	it("rejects cross-family, invalid input, stale revisions and missing configuration without locking", async () => {
		await expect(startCheckout({ ...requestManager, familyId: requestIds.other }, input)).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(startCheckout(requestManager, { ...input, amountMinor: 1 })).rejects.toThrow();
		await expect(startCheckout(requestManager, { ...input, revision: 1 })).rejects.toMatchObject({ code: "CONFLICT" });
		fake.client.mockImplementation(() => { throw new PayPalError("CONFIGURATION"); });
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "CONFIGURATION" });
		expect(database.state().payments).toHaveLength(0); expect(database.state().lockedAt).toBeNull(); expect(fake.create).not.toHaveBeenCalled();
	});
	it.each(["PAID", "DECLINED", "CANCELLED", "AWAITING_PAYMENT"])("refuses an ineligible %s request", async (status) => {
		database.state().status = status;
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ code: "CONFLICT" });
		expect(database.state().payments).toHaveLength(0); expect(fake.create).not.toHaveBeenCalled();
	});
	it("refuses a previously locked pending basket", async () => {
		database.state().lockedAt = requestNow;
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ code: "CONFLICT" });
		expect(fake.create).not.toHaveBeenCalled();
	});
	it("commits current approved snapshots on price conflict, requiring explicit revised review", async () => {
		database.state().items[0].product.demoPrices[0].priceMinor = 300;
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "PRICE_CHANGED" });
		expect(database.state()).toMatchObject({ revision: 1, status: "PENDING_REVIEW", subtotalMinor: 600, lockedAt: null });
		expect(database.state().items[0].unitPriceMinor).toBe(300);
		expect(database.state().payments).toHaveLength(0); expect(fake.create).not.toHaveBeenCalled();
		await startCheckout(requestManager, { ...input, revision: 1 });
		expect(database.state().payments[0].amountMinor).toBe(600);
	});
	it.each(["inactive", "archived", "missing-price", "future-price", "bad-currency", "zero-price", "bad-quantity", "too-many-items"])(
		"blocks %s without losing or locking the request", async (scenario) => {
			const item = database.state().items[0];
			if (scenario === "inactive") item.product.isActive = false;
			if (scenario === "archived") item.product.archivedAt = requestNow;
			if (scenario === "missing-price") item.product.demoPrices = [];
			if (scenario === "future-price") item.product.demoPrices[0].approvedAt = new Date(requestNow.getTime() + 1000);
			if (scenario === "bad-currency") item.product.demoPrices[0].currency = "EUR";
			if (scenario === "zero-price") item.product.demoPrices[0].priceMinor = 0;
			if (scenario === "bad-quantity") item.quantity = 21;
			if (scenario === "too-many-items") database.state().items = Array.from({ length: 31 }, () => structuredClone(item));
			await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "UNAVAILABLE_PRODUCT" });
			expect(database.state()).toMatchObject({ revision: 0, status: "PENDING_REVIEW", lockedAt: null });
			expect(database.state().payments).toHaveLength(0); expect(fake.create).not.toHaveBeenCalled();
		});
	it.each(["start", "price"])("rolls back the whole %s transaction when auditing fails", async (scenario) => {
		if (scenario === "price") database.state().items[0].product.demoPrices[0].priceMinor = 300;
		database.db.auditLog.create.mockRejectedValueOnce(new Error("audit failed"));
		await expect(startCheckout(requestManager, input)).rejects.toThrow("audit failed");
		expect(database.state()).toMatchObject({ revision: 0, status: "PENDING_REVIEW", subtotalMinor: 500, lockedAt: null });
		expect(database.state().items[0].unitPriceMinor).toBe(250);
		expect(database.state().payments).toHaveLength(0); expect(fake.create).not.toHaveBeenCalled();
	});
	it("reserves only one open payment under two simultaneous manager starts", async () => {
		const results = await Promise.allSettled([startCheckout(requestManager, input), startCheckout(requestManager, input)]);
		expect(results.some((result) => result.status === "fulfilled")).toBe(true);
		expect(database.state().payments).toHaveLength(1); expect(fake.create).toHaveBeenCalledOnce();
		expect(database.state().revision).toBe(1);
		await startCheckout(requestManager, input);
		expect(fake.create).toHaveBeenCalledOnce();
	});
	it.each(["checkout", "decline"])("serializes checkout against decline when %s acquires the shared request lock first", async (first) => {
		const decline = () => closeRequest(requestManager, { ...input, confirmed: true });
		const checkout = () => startCheckout(requestManager, input);
		const results = await Promise.allSettled(first === "checkout" ? [checkout(), decline()] : [decline(), checkout()]);
		expect(results.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
		expect(database.state().status).toBe(first === "checkout" ? "AWAITING_PAYMENT" : "DECLINED");
		expect(database.state().payments).toHaveLength(first === "checkout" ? 1 : 0);
	});
	it("keeps an unknown outcome locked, then recovers the original immutable payload and key", async () => {
		fake.create.mockRejectedValueOnce(new PayPalError("UNAVAILABLE"));
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "PROVIDER" });
		const payment = structuredClone(database.state().payments[0]);
		expect(payment.paypalOrderId).toBeNull(); expect(database.state().lockedAt).not.toBeNull();
		database.state().items[0].product.displayName = "Changed catalog name";
		database.state().items[0].product.demoPrices[0].priceMinor = 999;
		await startCheckout(requestManager, input);
		expect(database.state().payments).toHaveLength(1);
		expect(fake.create.mock.calls[0][1]).toEqual(fake.create.mock.calls[1][1]);
		expect(database.state().payments[0].id).toBe(payment.id);
	});
	it("recovers a successful provider create whose order ID was not committed locally", async () => {
		database.db.auditLog.create.mockResolvedValueOnce({ id: requestIds.other }).mockRejectedValueOnce(new Error("audit failed after create"));
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "PROVIDER" });
		expect(database.state().payments[0].paypalOrderId).toBeNull();
		await startCheckout(requestManager, input);
		expect(database.state().payments).toHaveLength(1);
		expect(fake.create.mock.calls[0][1]).toEqual(fake.create.mock.calls[1][1]);
		expect(database.state().payments[0].paypalOrderId).toBe("ORDER1");
	});
	it("unlocks only a definitive first-create rejection; a retry rejection cannot erase an unknown order", async () => {
		fake.create.mockRejectedValueOnce(new PayPalError("REJECTED", "NOT_CREATED"));
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "REJECTED" });
		expect(database.state()).toMatchObject({ status: "PENDING_REVIEW", revision: 2, lockedAt: null });
		expect(database.state().payments[0].status).toBe("VOIDED");
		fake.create.mockRejectedValueOnce(new PayPalError("UNAVAILABLE"));
		await expect(startCheckout(requestManager, { ...input, revision: 2 })).rejects.toMatchObject({ reason: "PROVIDER" });
		fake.create.mockRejectedValueOnce(new PayPalError("AUTHENTICATION", "NOT_CREATED"));
		await expect(startCheckout(requestManager, { ...input, revision: 2 })).rejects.toMatchObject({ reason: "PROVIDER" });
		expect(database.state().payments.map((payment) => payment.status)).toEqual(["VOIDED", "CREATED"]);
		expect(database.state().lockedAt).not.toBeNull();
	});
	it("recovers an expired worker lease but stops unknown POST replays before provider idempotency expires", async () => {
		const reserved = await reserveCheckout(requestManager, input, "fictional-sandbox-client");
		if (reserved.kind !== "attempt") throw new Error("Expected reserved attempt");
		const worker = await claimAttempt(requestManager, input.requestId, reserved.payment.id, "CREATE");
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "IN_PROGRESS" });
		vi.setSystemTime(new Date(requestNow.getTime() + 90_001));
		await startCheckout(requestManager, input);
		await expect(savePreparedOrder(requestManager, input.requestId, worker.payment.id, worker.token, "OLDORDER"))
			.rejects.toMatchObject({ code: "CONFLICT" });
		expect(database.state().payments[0].paypalOrderId).toBe("ORDER1");
		database.state().payments[0].paypalOrderId = null;
		vi.setSystemTime(new Date(requestNow.getTime() + 5 * 60 * 60_000));
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "RECONCILIATION" });
		expect(fake.create).toHaveBeenCalledOnce(); expect(database.state().lockedAt).not.toBeNull();
	});
	it("blocks cancellation during an active create and rejects cross-family payment access", async () => {
		await reserveCheckout(requestManager, input, "fictional-sandbox-client");
		const payment = database.state().payments[0];
		await claimAttempt(requestManager, input.requestId, payment.id, "CREATE");
		await expect(cancelCheckout(requestManager, cancellation())).rejects.toMatchObject({ reason: "IN_PROGRESS" });
		await expect(cancelCheckout({ ...requestManager, familyId: requestIds.other }, cancellation())).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(fake.read).not.toHaveBeenCalled(); expect(database.state().lockedAt).not.toBeNull();
	});
	it("cancels a never-started create and fences out subsequent provider work", async () => {
		await reserveCheckout(requestManager, input, "fictional-sandbox-client");
		await cancelCheckout(requestManager, cancellation());
		expect(fake.read).not.toHaveBeenCalled(); expect(fake.create).not.toHaveBeenCalled();
		expect(database.state().status).toBe("PENDING_REVIEW"); expect(database.state().lockedAt).toBeNull();
		await startCheckout(requestManager, { ...input, revision: 2 });
		expect(database.state().payments).toHaveLength(2);
		expect(database.state().payments.map((payment) => payment.status)).toEqual(["VOIDED", "CREATED"]);
	});
	it("cancels only after reading the known order, preserving attempt history and returning to review atomically", async () => {
		await startCheckout(requestManager, input);
		await cancelCheckout(requestManager, cancellation());
		expect(fake.read).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ paymentId: database.state().payments[0].id }), "ORDER1");
		expect(database.state()).toMatchObject({ revision: 2, status: "PENDING_REVIEW", lockedAt: null });
		expect(database.state().payments[0]).toMatchObject({ status: "VOIDED", paypalOrderId: "ORDER1" });
		expect(database.state().audits).toContain("checkout.cancelled");
	});
	it("recovers an unknown create with its existing key before cancellation", async () => {
		fake.create.mockRejectedValueOnce(new PayPalError("UNAVAILABLE"));
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "PROVIDER" });
		await cancelCheckout(requestManager, cancellation());
		expect(fake.create.mock.calls[0][1]).toEqual(fake.create.mock.calls[1][1]);
		expect(database.state().payments[0]).toMatchObject({ status: "VOIDED", paypalOrderId: "ORDER1" });
	});
	it.each(["APPROVED", "COMPLETED", "VOIDED"])("does not unlock when PayPal reports %s", async (status) => {
		await startCheckout(requestManager, input); fake.read.mockResolvedValueOnce({ ...sandboxOrder, status });
		await expect(cancelCheckout(requestManager, cancellation())).rejects.toMatchObject({ reason: "RECONCILIATION" });
		expect(database.state().status).toBe("AWAITING_PAYMENT"); expect(database.state().lockedAt).not.toBeNull();
		expect(database.state().payments[0].status).toBe("CREATED");
	});
	it("keeps capture-bearing, unknown, stale, and advanced local cancellations locked", async () => {
		await startCheckout(requestManager, input);
		await expect(cancelCheckout(requestManager, { ...cancellation(), revision: 0 })).rejects.toMatchObject({ code: "CONFLICT" });
		fake.read.mockResolvedValueOnce({ ...sandboxOrder, hasPayments: true });
		await expect(cancelCheckout(requestManager, cancellation())).rejects.toMatchObject({ reason: "RECONCILIATION" });
		fake.read.mockRejectedValueOnce(new PayPalError("UNAVAILABLE"));
		await expect(cancelCheckout(requestManager, cancellation())).rejects.toMatchObject({ reason: "PROVIDER" });
		database.state().payments[0].status = "CAPTURED";
		await expect(cancelCheckout(requestManager, cancellation())).rejects.toMatchObject({ code: "CONFLICT" });
		expect(database.state().lockedAt).not.toBeNull();
	});
	it("rolls back cancellation, unlock, and revision if its audit fails", async () => {
		await startCheckout(requestManager, input);
		database.db.auditLog.create.mockRejectedValueOnce(new Error("cancel audit failed"));
		await expect(cancelCheckout(requestManager, cancellation())).rejects.toMatchObject({ reason: "PROVIDER" });
		expect(database.state()).toMatchObject({ revision: 1, status: "AWAITING_PAYMENT" });
		expect(database.state().lockedAt).not.toBeNull(); expect(database.state().payments[0].status).toBe("CREATED");
	});
	it("prevents quantity edits, removals, decline and requester cancellation once checkout locks the basket", async () => {
		await startCheckout(requestManager, input);
		const locked = { requestId: input.requestId, revision: 1, confirmed: true as const };
		await expect(editRequestItem(requestManager, { ...locked, itemId: requestIds.item, quantity: 3 })).rejects.toMatchObject({ code: "CONFLICT" });
		await expect(editRequestItem(requestManager, { ...locked, itemId: requestIds.item })).rejects.toMatchObject({ code: "CONFLICT" });
		await expect(closeRequest(requestManager, locked)).rejects.toMatchObject({ code: "CONFLICT" });
		await expect(closeRequest(requester, locked)).rejects.toMatchObject({ code: "CONFLICT" });
		expect(database.state().subtotalMinor).toBe(500); expect(database.state().status).toBe("AWAITING_PAYMENT");
	});
	it("returns a minimal manager-only DTO without ever calling PayPal during GET/render", async () => {
		await startCheckout(requestManager, input); fake.create.mockClear(); fake.read.mockClear();
		expect(await getCheckout(requestManager, input.requestId)).toMatchObject({ orderId: "ORDER1", buyerApprovalEnabled: false });
		expect(await getCheckout({ ...requestManager, familyId: requestIds.other }, input.requestId)).toBeNull();
		await expect(Reflect.apply(getCheckout, undefined, [requester, input.requestId])).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(fake.create).not.toHaveBeenCalled(); expect(fake.read).not.toHaveBeenCalled();
	});
	it("does not replay or cancel under a different Sandbox application", async () => {
		await startCheckout(requestManager, input);
		fake.client.mockReturnValue({ clientId: "different-sandbox-app", orderRequest: vi.fn() });
		await expect(startCheckout(requestManager, input)).rejects.toMatchObject({ reason: "CONFIGURATION" });
		await expect(cancelCheckout(requestManager, cancellation())).rejects.toMatchObject({ reason: "CONFIGURATION" });
		expect(fake.create).toHaveBeenCalledOnce(); expect(fake.read).not.toHaveBeenCalled();
		expect(database.state().lockedAt).not.toBeNull();
	});
});
