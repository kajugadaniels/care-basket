// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requestManager, requester, requestNow, requestProduct } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ insert: vi.fn(), edit: vi.fn(), close: vi.fn(), own: vi.fn(), family: vi.fn(),
	ownList: vi.fn(), familyList: vi.fn(), count: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/requests/server/submission-repository", () => ({ insertRequest: fake.insert }));
vi.mock("@/features/requests/server/mutation-repository", () => ({ editRequestItem: fake.edit, closeRequest: fake.close }));
vi.mock("@/features/requests/server/repository", () => ({ readDeviceRequest: fake.own, readManagerRequest: fake.family,
	readDeviceRequests: fake.ownList, readManagerRequests: fake.familyList, countPendingRequests: fake.count }));
import { cancelRequest, countWaitingRequests, declineRequest, getFamilyRequest, getOwnRequest,
	listFamilyRequests, listOwnRequests, removeRequestItem, submitRequest, updateRequestItem } from "./service";

const submit = { clientRequestKey: requestIds.key, inputMode: "PICTURES", items: [{ sku: "demo-milk", quantity: 2 }] };
const closing = { requestId: requestIds.request, revision: 0, confirmed: true };
const row = { id: requestIds.request, status: "PENDING_REVIEW", submittedAt: requestNow, revision: 0,
	basket: { lockedAt: null, items: [{ id: requestIds.item, quantity: 2, product: requestProduct }] } };
describe("shopping request service authorization and DTOs", () => {
	beforeEach(() => vi.resetAllMocks());
	it("rejects forged actor types for every device capability", async () => {
		const forged = { ...requester, type: "adult" } as unknown as typeof requester;
		expect(() => submitRequest(forged, submit)).toThrow("FORBIDDEN");
		expect(() => cancelRequest(forged, closing)).toThrow("FORBIDDEN");
		await expect(getOwnRequest(forged, requestIds.request)).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(listOwnRequests(forged)).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(fake.insert).not.toHaveBeenCalled(); expect(fake.own).not.toHaveBeenCalled();
	});
	it("rejects device actors and unauthorized adult roles in every manager operation", async () => {
		const forged = { ...requestManager, role: "VIEWER" } as unknown as typeof requestManager;
		for (const actor of [forged, requester as unknown as typeof requestManager]) {
			expect(() => declineRequest(actor, closing)).toThrow("FORBIDDEN");
			expect(() => updateRequestItem(actor, {})).toThrow("FORBIDDEN");
			expect(() => removeRequestItem(actor, {})).toThrow("FORBIDDEN");
			expect(() => countWaitingRequests(actor)).toThrow("FORBIDDEN");
			await expect(getFamilyRequest(actor, requestIds.request)).rejects.toMatchObject({ code: "FORBIDDEN" });
			await expect(listFamilyRequests(actor)).rejects.toMatchObject({ code: "FORBIDDEN" });
		}
	});
	it.each(["OWNER", "MANAGER"] as const)("allows a %s to review its own family", async (role) => {
		fake.family.mockResolvedValue(null);
		await expect(getFamilyRequest({ ...requestManager, role }, requestIds.request)).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(fake.family).toHaveBeenCalledWith(requestIds.family, requestIds.request);
	});
	it("validates submissions and confirmations before repository work", () => {
		expect(() => submitRequest(requester, { ...submit, familyId: requestIds.other })).toThrow();
		expect(() => cancelRequest(requester, { ...closing, confirmed: false })).toThrow();
		expect(() => declineRequest(requestManager, { ...closing, confirmed: false })).toThrow();
		expect(fake.insert).not.toHaveBeenCalled(); expect(fake.close).not.toHaveBeenCalled();
	});
	it("forwards validated data and session-derived actors", async () => {
		fake.insert.mockResolvedValue({ requestId: requestIds.request });
		await submitRequest(requester, submit);
		expect(fake.insert).toHaveBeenCalledWith(requester, submit);
	});
	it("returns NOT_FOUND for missing, foreign or invalid IDs", async () => {
		fake.own.mockResolvedValue(null); fake.family.mockResolvedValue(null);
		await expect(getOwnRequest(requester, requestIds.other)).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(getFamilyRequest(requestManager, requestIds.other)).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(getOwnRequest(requester, "bad-id")).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
	it("projects a price-free device detail even if a fake record contains private fields", async () => {
		fake.own.mockResolvedValue({ ...row, inputText: "private", reviewedByUserId: "private",
			basket: { ...row.basket, subtotalMinor: 500, currency: "USD", items: [{ ...row.basket.items[0], unitPriceMinor: 250 }] } });
		const result = await getOwnRequest(requester, requestIds.request);
		expect(result.items[0]).toEqual({ ...requestProduct, id: requestIds.item, quantity: 2 });
		for (const field of ["price", "subtotal", "reviewedBy", "inputText", "currency"]) expect(JSON.stringify(result)).not.toContain(field);
	});
	it("server-formats manager snapshot prices and total", async () => {
		fake.family.mockResolvedValue({ ...row, profile: { displayName: "Demo Grandma" }, inputText: null,
			basket: { ...row.basket, subtotalMinor: 500, currency: "USD", items: [{ ...row.basket.items[0], unitPriceMinor: 250,
				origin: "REQUESTED", isSubstitute: false, substitutionNote: null }] } });
		expect(await getFamilyRequest(requestManager, requestIds.request)).toMatchObject({ subtotal: "$5.00",
			items: [{ unitPrice: "$2.50", lineTotal: "$5.00" }] });
	});
	it.each(["DECLINED", "CANCELLED", "PAID", "AWAITING_PAYMENT"])("does not expose editing for %s", async (status) => {
		fake.own.mockResolvedValue({ ...row, status });
		expect((await getOwnRequest(requester, requestIds.request)).editable).toBe(false);
	});
	it("does not expose editing for a locked pending request", async () => {
		fake.own.mockResolvedValue({ ...row, basket: { ...row.basket, lockedAt: requestNow } });
		expect((await getOwnRequest(requester, requestIds.request)).editable).toBe(false);
	});
	it("limits histories to 20 and supplies a real next cursor", async () => {
		fake.ownList.mockResolvedValue(Array.from({ length: 21 }, (_, index) => ({
			...row, id: `row-${index}`, basket: { _count: { items: 1 } },
		})));
		const result = await listOwnRequests(requester);
		expect(result.requests).toHaveLength(20); expect(result.nextCursor).toBe("row-19");
		expect(result.requests[0]).toEqual({ id: "row-0", status: "PENDING_REVIEW", submittedAt: requestNow.toISOString(), itemCount: 1 });
	});
});
