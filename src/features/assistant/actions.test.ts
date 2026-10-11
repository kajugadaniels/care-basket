// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requester, requestIds } from "@/test/factories/requests";
import { AppError } from "@/server/errors";

const fake = vi.hoisted(() => ({ device: vi.fn(), interpret: vi.fn(), page: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: fake.device }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: vi.fn() }));
vi.mock("@/server/logger", () => ({ logSecurityFailure: vi.fn() }));
vi.mock("./server/service", () => ({ estimateShoppingBudget: vi.fn(), updateAiPreference: vi.fn() }));
vi.mock("./server/saved-review", () => ({ interpretShoppingForReview: fake.interpret, loadShoppingReviewPage: fake.page }));

import { interpretTextAction, loadReviewProductsAction } from "./actions";

describe("saved text review action", () => {
	beforeEach(() => {
		vi.resetAllMocks(); fake.device.mockResolvedValue(requester);
		fake.interpret.mockResolvedValue({ reviewId: requestIds.key, items: [], inputText: "milk" });
	});
	it("authenticates and validates text before returning a private review lookup", async () => {
		expect(await interpretTextAction({ text: " milk " })).toMatchObject({ ok: true, data: { reviewId: requestIds.key } });
		expect(fake.interpret).toHaveBeenCalledWith(requester, { kind: "text", text: "milk" });
		expect(fake.device.mock.invocationCallOrder[0]).toBeLessThan(fake.interpret.mock.invocationCallOrder[0]);
	});
	it.each([{ text: "" }, { text: "x".repeat(501) }, { text: "milk", familyId: requestIds.other }])("rejects invalid or ownership-bearing input", async (input) => {
		expect(await interpretTextAction(input)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
		expect(fake.interpret).not.toHaveBeenCalled();
	});
	it("does not interpret or save for a missing, expired or revoked session", async () => {
		fake.device.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		expect(await interpretTextAction({ text: "milk" })).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
		expect(fake.interpret).not.toHaveBeenCalled();
	});
	it("returns a safe failure when storing the private review fails", async () => {
		fake.interpret.mockRejectedValue(new Error("private database detail"));
		const result = await interpretTextAction({ text: "milk" });
		expect(result).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
		expect(JSON.stringify(result)).not.toContain("private database detail");
	});
});

describe("private review paging action", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.device.mockResolvedValue(requester);
		fake.page.mockResolvedValue({ items: [], nextCursor: null });
	});
	it("authenticates each bounded page without interpreting again", async () => {
		expect(await loadReviewProductsAction({ reviewId: requestIds.key, offset: 12 })).toEqual({ ok: true, data: { items: [], nextCursor: null } });
		expect(fake.page).toHaveBeenCalledWith(requester, { reviewId: requestIds.key, offset: 12 });
		expect(fake.interpret).not.toHaveBeenCalled();
	});
	it.each([-12, 1, 204, 12.5])("rejects invalid offset %s", async (offset) => {
		expect(await loadReviewProductsAction({ reviewId: requestIds.key, offset })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
		expect(fake.page).not.toHaveBeenCalled();
	});
	it("rejects ownership-bearing input", async () => {
		expect(await loadReviewProductsAction({ reviewId: requestIds.key, offset: 12, familyId: requestIds.family })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
		expect(fake.page).not.toHaveBeenCalled();
	});
	it("rejects revoked devices before reading a review", async () => {
		fake.device.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		expect(await loadReviewProductsAction({ reviewId: requestIds.key, offset: 12 })).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
		expect(fake.page).not.toHaveBeenCalled();
	});
	it.each(["NOT_FOUND", "RATE_LIMITED"] as const)("maps %s without exposing private data", async (code) => {
		fake.page.mockRejectedValue(new AppError(code));
		expect(await loadReviewProductsAction({ reviewId: requestIds.key, offset: 12 })).toMatchObject({ ok: false, error: { code } });
	});
});
