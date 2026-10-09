// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requestManager, requester } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ find: vi.fn(), cas: vi.fn(), basket: vi.fn(), itemUpdate: vi.fn(), itemDelete: vi.fn(),
	total: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ $transaction: fake.transaction }) }));
import { closeRequest, editRequestItem } from "./mutation-repository";

const tx = { shoppingRequest: { findFirst: fake.find, updateMany: fake.cas },
	shoppingBasket: { findFirst: fake.basket, updateMany: fake.total },
	basketItem: { updateMany: fake.itemUpdate, deleteMany: fake.itemDelete }, auditLog: { create: fake.audit } };
type State = { revision: number; status: string; lockedAt: Date | null; subtotalMinor: number;
	items: { id: string; quantity: number; unitPriceMinor: number }[] };
let committed: State;
let staged: State;
let tail: Promise<unknown>;
const edit = { requestId: requestIds.request, itemId: requestIds.item, revision: 0, quantity: 3 };
const closing = { requestId: requestIds.request, revision: 0, confirmed: true as const };

describe("request revisions and atomic edits", () => {
	beforeEach(() => {
		vi.resetAllMocks(); tail = Promise.resolve();
		committed = { revision: 0, status: "PENDING_REVIEW", lockedAt: null, subtotalMinor: 600,
			items: [{ id: requestIds.item, quantity: 2, unitPriceMinor: 250 }, { id: requestIds.other, quantity: 1, unitPriceMinor: 100 }] };
		fake.transaction.mockImplementation((work: (client: typeof tx) => Promise<unknown>) => {
			const result = tail.then(async () => {
				staged = { ...committed, items: committed.items.map((item) => ({ ...item })) };
				const value = await work(tx); committed = staged; return value;
			});
			tail = result.then(() => undefined, () => undefined); return result;
		});
		fake.find.mockImplementation(({ where }: { where: { familyId: string; profileId?: string } }) =>
			where.familyId !== requestIds.family || (where.profileId && where.profileId !== requestIds.profile)
				? null : { id: requestIds.request, status: staged.status });
		fake.cas.mockImplementation(({ where, data }: { where: { revision: number; status: string }; data: { status?: string } }) => {
			if (staged.revision !== where.revision || staged.status !== where.status || staged.lockedAt) return { count: 0 };
			staged.revision++; if (data.status) staged.status = data.status; return { count: 1 };
		});
		fake.basket.mockImplementation(() => ({ id: requestIds.basket, items: staged.items }));
		fake.itemUpdate.mockImplementation(({ where, data }: { where: { id: string }; data: { quantity: number } }) => {
			staged.items = staged.items.map((item) => item.id === where.id ? { ...item, quantity: data.quantity } : item);
			return { count: 1 };
		});
		fake.itemDelete.mockImplementation(({ where }: { where: { id: string } }) => {
			staged.items = staged.items.filter((item) => item.id !== where.id); return { count: 1 };
		});
		fake.total.mockImplementation(({ data }: { data: { subtotalMinor: number } }) => { staged.subtotalMinor = data.subtotalMinor; return { count: 1 }; });
		fake.audit.mockResolvedValue({ id: requestIds.other });
	});
	it("keeps snapshot prices and recomputes totals with an audit", async () => {
		await editRequestItem(requestManager, edit);
		expect(committed).toMatchObject({ revision: 1, status: "PENDING_REVIEW", subtotalMinor: 850 });
		expect(committed.items[0]).toMatchObject({ quantity: 3, unitPriceMinor: 250 });
		expect(fake.itemUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: { quantity: 3 },
			where: expect.objectContaining({ basket: { familyId: requestIds.family, requestId: requestIds.request } }) }));
		expect(fake.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "basket.item_updated" }) }));
	});
	it("removes an item and recalculates in the same transaction", async () => {
		await editRequestItem(requestManager, { requestId: requestIds.request, itemId: requestIds.other, revision: 0 });
		expect(committed.items).toHaveLength(1); expect(committed.subtotalMinor).toBe(500);
	});
	it("rolls back revision and item changes if auditing fails", async () => {
		fake.audit.mockRejectedValue(new Error("audit failed"));
		await expect(editRequestItem(requestManager, edit)).rejects.toThrow("audit failed");
		expect(committed.revision).toBe(0); expect(committed.subtotalMinor).toBe(600); expect(committed.items[0].quantity).toBe(2);
	});
	it("refuses an empty basket instead of silently declining", async () => {
		committed.items = [committed.items[0]]; committed.subtotalMinor = 500;
		await expect(editRequestItem(requestManager, { ...closing, itemId: requestIds.item })).rejects.toMatchObject({ code: "CONFLICT" });
		expect(committed.items).toHaveLength(1); expect(committed.status).toBe("PENDING_REVIEW"); expect(committed.revision).toBe(0);
	});
	it.each(["DECLINED", "CANCELLED", "PAID", "AWAITING_PAYMENT"])("refuses edits when status is %s", async (status) => {
		committed.status = status;
		await expect(editRequestItem(requestManager, edit)).rejects.toMatchObject({ code: "CONFLICT" });
		expect(fake.itemUpdate).not.toHaveBeenCalled();
	});
	it("refuses locked baskets and stale revisions", async () => {
		committed.lockedAt = new Date("2026-10-09");
		await expect(editRequestItem(requestManager, edit)).rejects.toMatchObject({ code: "CONFLICT" });
		committed.lockedAt = null; committed.revision = 1;
		await expect(editRequestItem(requestManager, edit)).rejects.toMatchObject({ code: "CONFLICT" });
	});
	it("cannot use an item from another basket", async () => {
		await expect(editRequestItem(requestManager, { ...edit, itemId: requestIds.user })).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(committed.revision).toBe(0); expect(fake.itemUpdate).not.toHaveBeenCalled();
	});
	it("returns NOT_FOUND across family and profile boundaries", async () => {
		await expect(editRequestItem({ ...requestManager, familyId: requestIds.other }, edit)).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(closeRequest({ ...requester, profileId: requestIds.other }, closing)).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(closeRequest({ ...requester, familyId: requestIds.other }, closing)).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(fake.cas).not.toHaveBeenCalled();
	});
	it("declines with reviewer metadata and makes repeats a no-op", async () => {
		await closeRequest(requestManager, closing); await closeRequest(requestManager, closing);
		expect(committed.status).toBe("DECLINED"); expect(fake.cas).toHaveBeenCalledOnce(); expect(fake.audit).toHaveBeenCalledOnce();
		expect(fake.cas).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reviewedByUserId: requestIds.user, reviewedAt: expect.any(Date) }) }));
	});
	it("cancels only the device's profile and retains the list", async () => {
		await closeRequest(requester, closing); await closeRequest(requester, closing);
		expect(committed.status).toBe("CANCELLED"); expect(committed.items).toHaveLength(2); expect(fake.audit).toHaveBeenCalledOnce();
		expect(fake.cas).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ familyId: requestIds.family, profileId: requestIds.profile }) }));
	});
	it("rolls back cancellation when its audit fails", async () => {
		fake.audit.mockRejectedValue(new Error("audit failed"));
		await expect(closeRequest(requester, closing)).rejects.toThrow("audit failed");
		expect(committed.status).toBe("PENDING_REVIEW"); expect(committed.revision).toBe(0);
	});
	it.each(["edit", "decline"])("cancellation racing with %s has one winner", async (operation) => {
		const results = await Promise.allSettled([closeRequest(requester, closing),
			operation === "edit" ? editRequestItem(requestManager, edit) : closeRequest(requestManager, closing)]);
		expect(results.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
		expect(committed.revision).toBe(1); expect(committed.status).toBe("CANCELLED"); expect(fake.audit).toHaveBeenCalledOnce();
	});
	it("two manager edits using one revision cannot overwrite each other", async () => {
		const results = await Promise.allSettled([editRequestItem(requestManager, edit), editRequestItem(requestManager, { ...edit, quantity: 9 })]);
		expect(results.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
		expect(committed.subtotalMinor).toBe(850); expect(committed.revision).toBe(1);
	});
});
