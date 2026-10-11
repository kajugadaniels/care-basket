// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requester, requestIds } from "@/test/factories/requests";
import { AppError } from "@/server/errors";

const fake = vi.hoisted(() => ({ device: vi.fn(), list: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: fake.device }));
vi.mock("@/server/logger", () => ({ logSecurityFailure: vi.fn() }));
vi.mock("./server/service", () => ({ listRequesterProducts: fake.list }));
import { loadRequesterProductsAction } from "./actions";

describe("requester catalog batches", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.device.mockResolvedValue({ ...requester, profileKind: "CHILD" });
		fake.list.mockResolvedValue({ products: [], nextCursor: null });
	});
	it("authenticates each page and fixes the batch at twelve while preserving filters", async () => {
		expect(await loadRequesterProductsAction({ cursor: requestIds.key, q: " rice ", category: "PANTRY" }))
			.toEqual({ ok: true, data: { items: [], nextCursor: null } });
		expect(fake.list).toHaveBeenCalledWith({ ...requester, profileKind: "CHILD" }, {
			cursor: requestIds.key, q: "rice", category: "PANTRY", limit: 12,
		});
	});
	it.each([{ cursor: "bad" }, { cursor: requestIds.key, before: requestIds.other },
		{ cursor: requestIds.key, familyId: requestIds.family }, { cursor: requestIds.key, limit: 500 },
		{ cursor: requestIds.key, q: "x".repeat(81) }])("rejects unbounded, malformed or ownership-bearing input", async (input) => {
		expect(await loadRequesterProductsAction(input)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
		expect(fake.list).not.toHaveBeenCalled();
	});
	it("rejects a revoked device before reading products", async () => {
		fake.device.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		expect(await loadRequesterProductsAction({ cursor: requestIds.key })).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
		expect(fake.list).not.toHaveBeenCalled();
	});
	it("maps failures without exposing database details", async () => {
		fake.list.mockRejectedValue(new Error("private database detail"));
		const result = await loadRequesterProductsAction({ cursor: requestIds.key });
		expect(result).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
		expect(JSON.stringify(result)).not.toContain("private database detail");
	});
});
