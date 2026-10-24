// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ many: vi.fn().mockResolvedValue([]), first: vi.fn().mockResolvedValue(null) }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ catalogProduct: { findMany: mocks.many, findFirst: mocks.first } }) }));
import { findCatalogRow, findCatalogRows, listCatalogRows } from "./repository";

describe("shared catalog queries", () => {
	beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-12T10:00:00Z")); vi.clearAllMocks(); });
	afterEach(() => vi.useRealTimers());
	it("reads the nearest preceding rows without offsets and retains suitability and search", async () => {
		const before = "019a1234-0000-7000-8000-000000000099";
		await listCatalogRows({ q: "beans", category: "PANTRY", before, limit: 49 }, true);
		expect(mocks.many).toHaveBeenLastCalledWith(expect.objectContaining({
			take: 50, orderBy: { id: "desc" },
			where: expect.objectContaining({ id: { lt: before }, category: "PANTRY", isChildSuitable: true, OR: expect.any(Array) }),
		}));
	});
	it("bounds the list and applies active, archive, category, child and approved-price filters in one query", async () => {
		await listCatalogRows({ q: "Rice", category: "PANTRY", cursor: "019a1234-0000-7000-8000-000000000001", limit: 24 }, true);
		expect(mocks.many).toHaveBeenLastCalledWith(expect.objectContaining({
			take: 25, orderBy: { id: "asc" },
			where: expect.objectContaining({ isActive: true, archivedAt: null, isChildSuitable: true, category: "PANTRY", id: { gt: "019a1234-0000-7000-8000-000000000001" }, demoPrices: { some: { currency: "USD", priceMinor: { gt: 0, lte: 50_000 }, approvedAt: { lte: expect.any(Date) } } }, OR: [{ displayName: { contains: "Rice", mode: "insensitive" } }, { synonyms: { has: "rice" } }] }),
		}));
	});
	it("queries individual products with availability and suitability in the same lookup", async () => {
		await findCatalogRow("example-rice", true);
		expect(mocks.first).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ sku: "example-rice", isChildSuitable: true, isActive: true, archivedAt: null }) }));
	});
	it("reads a bounded product set in one query", async () => {
		await findCatalogRows(["example-rice", "example-beans"], false);
		expect(mocks.many).toHaveBeenLastCalledWith(expect.objectContaining({
			take: 2,
			orderBy: { id: "asc" },
			where: expect.objectContaining({
				sku: { in: ["example-rice", "example-beans"] },
				isActive: true,
				archivedAt: null,
			}),
		}));
	});
	it("uses the same current approval cutoff for eligibility and the selected price", async () => {
		await listCatalogRows({ q: "", limit: 12 }, false);
		const list = mocks.many.mock.lastCall?.[0];
		expect(list.select.demoPrices.where).toEqual(list.where.demoPrices.some);
		expect(list.select.demoPrices.where.approvedAt.lte).toEqual(new Date("2026-10-12T10:00:00Z"));
		vi.setSystemTime(new Date("2026-10-12T11:00:00Z"));
		expect(list.where).not.toHaveProperty("isChildSuitable");
		await findCatalogRow("example-rice", true);
		const product = mocks.first.mock.lastCall?.[0];
		expect(product.select.demoPrices.where).toEqual(product.where.demoPrices.some);
		expect(product.select.demoPrices.where.approvedAt.lte).toEqual(new Date("2026-10-12T11:00:00Z"));
		expect(product.where.isChildSuitable).toBe(true);
	});
});
