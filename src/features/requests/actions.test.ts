// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requester, requestManager } from "@/test/factories/requests";
import { AppError } from "@/server/errors";
const fake = vi.hoisted(() => ({ device: vi.fn(), adult: vi.fn(), limit: vi.fn(), submit: vi.fn(), cancel: vi.fn(),
	update: vi.fn(), remove: vi.fn(), decline: vi.fn(), revalidate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: fake.revalidate }));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: fake.device, assertDevicePermission: (actor: { type: string }) => {
	if (actor.type !== "device") throw new AppError("FORBIDDEN");
} }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: fake.adult }));
vi.mock("@/server/rate-limit/limiter", () => ({ enforceRateLimit: fake.limit }));
vi.mock("@/features/requests/server/service", () => ({ submitRequest: fake.submit, cancelRequest: fake.cancel,
	updateRequestItem: fake.update, removeRequestItem: fake.remove, declineRequest: fake.decline }));
import { cancelRequestAction, declineRequestAction, removeRequestItemAction, submitRequestAction, updateRequestItemAction } from "./actions";

describe("authenticated request actions", () => {
	beforeEach(() => {
		vi.resetAllMocks(); fake.device.mockResolvedValue(requester); fake.adult.mockResolvedValue(requestManager);
		for (const action of [fake.submit, fake.cancel, fake.update, fake.remove, fake.decline]) action.mockResolvedValue({ requestId: requestIds.request });
	});
	it("authenticates before the 20/hour PostgreSQL limiter and submission", async () => {
		await submitRequestAction({ draft: "untrusted" });
		expect(fake.limit).toHaveBeenCalledWith(`request:submit:${requestIds.device}`, 20, 3_600_000);
		expect(fake.submit).toHaveBeenCalledWith(requester, { draft: "untrusted" });
		expect(fake.device.mock.invocationCallOrder[0]).toBeLessThan(fake.limit.mock.invocationCallOrder[0]);
		expect(fake.limit.mock.invocationCallOrder[0]).toBeLessThan(fake.submit.mock.invocationCallOrder[0]);
	});
	it.each(["UNAUTHENTICATED", "RATE_LIMITED"] as const)("does not submit after %s", async (code) => {
		(code === "UNAUTHENTICATED" ? fake.device : fake.limit).mockRejectedValue(new AppError(code, "private details"));
		const result = await submitRequestAction({});
		expect(result).toMatchObject({ ok: false, error: { code } });
		expect(JSON.stringify(result)).not.toContain("private details"); expect(fake.submit).not.toHaveBeenCalled();
	});
	it.each([updateRequestItemAction, removeRequestItemAction, declineRequestAction])("reauthenticates every adult operation", async (action) => {
		await action({ requestId: requestIds.request });
		expect(fake.adult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
		expect(fake.device).not.toHaveBeenCalled();
	});
	it("cancels as the assigned device, never through Clerk", async () => {
		await cancelRequestAction({}); expect(fake.cancel).toHaveBeenCalledWith(requester, {}); expect(fake.adult).not.toHaveBeenCalled();
	});
	it.each([updateRequestItemAction, removeRequestItemAction, declineRequestAction])("rejects manager writes when adult authentication fails", async (action) => {
		fake.adult.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		expect(await action({})).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
		expect(fake.update).not.toHaveBeenCalled(); expect(fake.remove).not.toHaveBeenCalled(); expect(fake.decline).not.toHaveBeenCalled();
	});
	it("invalidates dashboard, inbox, history and both details after success", async () => {
		await submitRequestAction({});
		expect(fake.revalidate.mock.calls.map(([path]) => path)).toEqual([
			"/family", "/family/requests", `/family/requests/${requestIds.request}`, "/shop/requests", `/shop/requests/${requestIds.request}`,
		]);
	});
	it("returns a friendly conflict without revalidating failed mutations", async () => {
		fake.update.mockRejectedValue(new AppError("CONFLICT"));
		expect(await updateRequestItemAction({})).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
		expect(fake.revalidate).not.toHaveBeenCalled();
	});
});
