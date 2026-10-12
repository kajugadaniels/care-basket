// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requestManager } from "@/test/factories/requests";
import { AppError } from "@/server/errors";
const fake = vi.hoisted(() => ({ adult: vi.fn(), start: vi.fn(), cancel: vi.fn(), reconcile: vi.fn(), limit: vi.fn(), revalidate: vi.fn(), log: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: fake.revalidate }));
vi.mock("next/navigation", () => ({ unstable_rethrow: (error: unknown) => { if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error; } }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: fake.adult }));
vi.mock("@/server/rate-limit/limiter", () => ({ enforceRateLimit: fake.limit }));
vi.mock("@/server/logger", () => ({ logSecurityFailure: fake.log }));
vi.mock("./server/service", () => ({ startCheckout: fake.start, cancelCheckout: fake.cancel }));
vi.mock("./server/capture-service", () => ({ reconcileCheckout: fake.reconcile }));
import { cancelCheckoutAction, captureCheckoutAction, refreshCheckoutAction, startCheckoutAction } from "./actions";
import { CheckoutFailure } from "./server/failure";
import { checkoutCopy as copy } from "./copy";

const input = { requestId: requestIds.request, revision: 0 };
const checkout = { paymentId: requestIds.key, orderId: "ORDER1", state: "PREPARED", amount: "$5.00", buyerApprovalEnabled: false };

describe("authenticated checkout actions", () => {
	beforeEach(() => {
		vi.resetAllMocks(); fake.adult.mockResolvedValue(requestManager); fake.start.mockResolvedValue(checkout);
		fake.cancel.mockResolvedValue({ requestId: input.requestId }); fake.limit.mockResolvedValue(undefined);
		fake.reconcile.mockResolvedValue(checkout);
	});
	it("requires the manager actor, validates, rate-limits and revalidates manager/requester paths", async () => {
		expect(await startCheckoutAction(input)).toEqual({ ok: true, data: checkout });
		expect(fake.adult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
		expect(fake.limit).toHaveBeenCalledWith(`checkout:start:${requestIds.family}:${input.requestId}`, 10, 3_600_000);
		expect(fake.start).toHaveBeenCalledWith(requestManager, input);
		expect(fake.adult.mock.invocationCallOrder[0]).toBeLessThan(fake.limit.mock.invocationCallOrder[0]);
		expect(fake.limit.mock.invocationCallOrder[0]).toBeLessThan(fake.start.mock.invocationCallOrder[0]);
		for (const path of ["/family", "/family/requests", `/family/requests/${input.requestId}`, "/shop/requests", `/shop/requests/${input.requestId}`]) {
			expect(fake.revalidate).toHaveBeenCalledWith(path);
		}
	});
	it("rejects unauthenticated actors and preserves framework redirects", async () => {
		fake.adult.mockRejectedValueOnce(new AppError("UNAUTHENTICATED"));
		expect(await startCheckoutAction(input)).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
		fake.adult.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
		await expect(startCheckoutAction(input)).rejects.toThrow("NEXT_REDIRECT");
		expect(fake.start).not.toHaveBeenCalled(); expect(fake.limit).not.toHaveBeenCalled();
	});
	it("rejects client prices and identities before persistence or provider work", async () => {
		expect(await startCheckoutAction({ ...input, amountMinor: 1, familyId: requestIds.other })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
		expect(fake.start).not.toHaveBeenCalled(); expect(fake.limit).not.toHaveBeenCalled(); expect(fake.revalidate).not.toHaveBeenCalled();
	});
	it("returns safe rate-limit errors without starting checkout", async () => {
		fake.limit.mockRejectedValue(new AppError("RATE_LIMITED"));
		expect(await startCheckoutAction(input)).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
		expect(fake.start).not.toHaveBeenCalled();
	});
	it.each(["PRICE_CHANGED", "UNAVAILABLE_PRODUCT", "IN_PROGRESS", "RECONCILIATION", "CONFIGURATION", "PROVIDER", "REJECTED"] as const)(
		"maps %s to reviewed inline copy and refreshes committed state", async (reason) => {
			fake.start.mockRejectedValue(new CheckoutFailure(reason));
			expect(await startCheckoutAction(input)).toMatchObject({ ok: false, error: { message: copy.errors[reason] } });
			expect(fake.revalidate).toHaveBeenCalledWith(`/family/requests/${input.requestId}`);
		});
	it("does not log raw provider errors or return diagnostics", async () => {
		fake.start.mockRejectedValue(new Error("private payer and credential information"));
		const result = await startCheckoutAction(input);
		expect(JSON.stringify(result)).not.toContain("private payer");
		expect(JSON.stringify(fake.log.mock.calls)).not.toContain("private payer");
		expect(fake.log).toHaveBeenCalledWith(expect.objectContaining({ event: "checkout.action_failed", code: "INTERNAL" }));
	});
	it("requires an explicit confirmation and scopes cancellation through the authenticated actor", async () => {
		const cancel = { ...input, paymentId: requestIds.key, confirmed: true };
		expect(await cancelCheckoutAction({ ...input, paymentId: requestIds.key })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
		expect(fake.cancel).not.toHaveBeenCalled();
		expect(await cancelCheckoutAction(cancel)).toEqual({ ok: true, data: { requestId: input.requestId } });
		expect(fake.cancel).toHaveBeenCalledWith(requestManager, cancel);
		expect(fake.limit).toHaveBeenCalledWith(`checkout:cancel:${requestIds.family}:${input.requestId}`, 10, 3_600_000);
	});
	it.each([true, false])("authenticates and bounds payment reconciliation with capture=%s", async (capture) => {
		const action = capture ? captureCheckoutAction : refreshCheckoutAction;
		const value = { requestId: input.requestId, paypalOrderId: "ORDER1" };
		expect(await action(value)).toEqual({ ok: true, data: checkout });
		expect(fake.adult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
		expect(fake.limit).toHaveBeenCalledWith(`checkout:payment:${requestIds.family}:${input.requestId}`, 10, 60_000);
		expect(fake.reconcile).toHaveBeenCalledWith(requestManager, value, capture);
		expect(fake.revalidate).toHaveBeenCalledWith(`/shop/requests/${input.requestId}`);
	});
	it.each([captureCheckoutAction, refreshCheckoutAction])("rejects extra client prices/identities and unauthenticated payment actions", async (action) => {
		const value = { requestId: input.requestId, paypalOrderId: "ORDER1" };
		expect(await action({ ...value, familyId: requestIds.other, amountMinor: 1 })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
		fake.adult.mockRejectedValueOnce(new AppError("UNAUTHENTICATED"));
		expect(await action(value)).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
		expect(fake.reconcile).not.toHaveBeenCalled();
	});
});
