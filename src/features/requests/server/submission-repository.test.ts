// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requester, requestNow } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ find: vi.fn(), products: vi.fn(), device: vi.fn(), create: vi.fn(), basket: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => ({
	shoppingRequest: { findFirst: fake.find }, $transaction: fake.transaction,
}) }));
import { insertRequest } from "./submission-repository";
import { submissionFingerprint } from "./basket-policy";

const input = { clientRequestKey: requestIds.key, inputMode: "PICTURES" as const, items: [{ sku: "demo-milk", quantity: 2 }] };
const transaction = { shoppingRequest: { create: fake.create }, shoppingBasket: { create: fake.basket }, catalogProduct: { findMany: fake.products },
	authorizedDevice: { findFirst: fake.device }, auditLog: { create: fake.audit } };
type BasketData = { subtotalMinor: number; items: { create: { quantity: number; unitPriceMinor: number }[] } };
type Stored = { id: string; submissionHash: string; basket?: BasketData };
let committed: Stored[];
let staged: Stored | null;
let tail: Promise<unknown>;

describe("atomic shopping submission", () => {
	beforeEach(() => {
		vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(requestNow);
		committed = []; staged = null; tail = Promise.resolve();
		fake.find.mockImplementation(() => committed[0] ?? null);
		fake.device.mockResolvedValue({ id: requestIds.device });
		fake.products.mockResolvedValue([{ id: requestIds.other, sku: "demo-milk",
			demoPrices: [{ currency: "USD", priceMinor: 250, approvedAt: requestNow }] }]);
		fake.create.mockImplementation(({ data }: { data: { submissionHash: string } }) => {
			if (committed.length) throw Object.assign(new Error(), { code: "P2002" });
			staged = { id: requestIds.request, submissionHash: data.submissionHash };
			return { id: requestIds.request };
		});
		fake.audit.mockResolvedValue({ id: requestIds.other });
		fake.basket.mockImplementation(({ data }: { data: BasketData }) => {
			if (!staged) throw new Error("missing request");
			staged.basket = data;
			return { id: requestIds.basket };
		});
		fake.transaction.mockImplementation((work: (tx: typeof transaction) => Promise<unknown>) => {
			const result = tail.then(async () => {
				staged = null;
				try { const value = await work(transaction); if (staged) committed.push(staged); return value; }
				finally { staged = null; }
			});
			tail = result.then(() => undefined, () => undefined);
			return result;
		});
	});
	afterEach(() => vi.useRealTimers());
	it("stores snapshots, subtotal and audit in one transaction with actor-owned IDs", async () => {
		await expect(insertRequest(requester, input)).resolves.toEqual({ requestId: requestIds.request });
		expect(fake.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
			familyId: requester.familyId, profileId: requester.profileId, deviceId: requester.deviceId,
			status: "PENDING_REVIEW", fulfillmentStatus: "NOT_STARTED",
		}) }));
		expect(fake.basket).toHaveBeenCalledWith(expect.objectContaining({ data: {
			requestId: requestIds.request, familyId: requester.familyId, currency: "USD", subtotalMinor: 500,
			items: { create: [{ productId: requestIds.other, quantity: 2, unitPriceMinor: 250, origin: "REQUESTED", isSubstitute: false }] },
		} }));
		expect(fake.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "request.submitted", actorId: requester.deviceId }) }));
		expect(committed).toHaveLength(1); expect(committed[0].basket?.subtotalMinor).toBe(500);
	});
	it("rechecks child suitability, activity, archive and approved price in the DB", async () => {
		await insertRequest({ ...requester, profileKind: "CHILD" }, input);
		expect(fake.products).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isChildSuitable: true, isActive: true, archivedAt: null }) }));
		expect(fake.device).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ revokedAt: null,
			familyId: requester.familyId, profileId: requester.profileId, profile: { kind: "CHILD" } }) }));
	});
	it("refuses unknown, archived, inactive or child-unsuitable products excluded by the query", async () => {
		fake.products.mockResolvedValue([]);
		await expect(insertRequest(requester, input)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
		expect(committed).toEqual([]); expect(fake.create).not.toHaveBeenCalled();
	});
	it.each([[], [{ currency: "EUR", priceMinor: 250, approvedAt: requestNow }],
		[{ currency: "USD", priceMinor: 0, approvedAt: requestNow }], [{ currency: "USD", priceMinor: 3.49, approvedAt: requestNow }],
		[{ currency: "USD", priceMinor: 250, approvedAt: new Date("2099-01-01") }]])("refuses invalid demo price %j", async (demoPrices) => {
		fake.products.mockResolvedValue([{ id: requestIds.other, sku: "demo-milk", demoPrices }]);
		await expect(insertRequest(requester, input)).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
		expect(committed).toEqual([]);
	});
	it("refuses a revoked session at transaction time", async () => {
		fake.device.mockResolvedValue(null);
		await expect(insertRequest(requester, input)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
		expect(fake.products).not.toHaveBeenCalled();
	});
	it("rolls back created rows when auditing fails", async () => {
		fake.audit.mockRejectedValue(new Error("audit unavailable"));
		await expect(insertRequest(requester, input)).rejects.toThrow("audit unavailable");
		expect(fake.create).toHaveBeenCalledOnce(); expect(committed).toEqual([]);
	});
	it("returns an existing submission without repricing an edited basket", async () => {
		committed = [{ id: requestIds.request, submissionHash: submissionFingerprint(input) }];
		await expect(insertRequest(requester, input)).resolves.toEqual({ requestId: requestIds.request });
		expect(fake.products).not.toHaveBeenCalled(); expect(fake.transaction).not.toHaveBeenCalled();
		expect(fake.find).toHaveBeenCalledWith(expect.objectContaining({ where: {
			familyId: requester.familyId, profileId: requester.profileId, clientRequestKey: input.clientRequestKey,
		} }));
	});
	it("rejects key reuse with different original contents", async () => {
		committed = [{ id: requestIds.request, submissionHash: "different" }];
		await expect(insertRequest(requester, input)).rejects.toMatchObject({ code: "CONFLICT" });
	});
	it("concurrent identical submissions create exactly one request", async () => {
		const results = await Promise.all([insertRequest(requester, input), insertRequest(requester, input)]);
		expect(results).toEqual([{ requestId: requestIds.request }, { requestId: requestIds.request }]);
		expect(committed).toHaveLength(1); expect(fake.audit).toHaveBeenCalledOnce();
	});
	it("concurrent different submissions using one key conflict", async () => {
		const results = await Promise.allSettled([insertRequest(requester, input),
			insertRequest(requester, { ...input, items: [{ sku: "demo-milk", quantity: 3 }] })]);
		expect(results.map((result) => result.status)).toEqual(["fulfilled", "rejected"]);
		expect(committed).toHaveLength(1);
	});
});
