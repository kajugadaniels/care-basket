// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requester } from "@/test/factories/requests";

const mocks = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), getMany: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/features/catalog/server/service", () => ({
	listRequesterProducts: mocks.list,
	getRequesterProduct: mocks.get,
	getRequesterProducts: mocks.getMany,
}));
import {
	compareProductsForShoppingGuide,
	getProductForShoppingGuide,
	searchCatalogForShoppingGuide,
} from "./catalog-capabilities";

const rice = {
	sku: "example-rice",
	displayName: "Example Rice",
	category: "PANTRY" as const,
	sizeLabel: "1 lb",
	imagePath: "/products/example-rice.jpg",
};
const largeRice = {
	...rice,
	sku: "example-rice-large",
	sizeLabel: "2 lb",
};

describe("shopping guide catalog capabilities", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.list.mockResolvedValue({ products: [rice], nextCursor: null });
		mocks.get.mockResolvedValue(rice);
		mocks.getMany.mockResolvedValue([rice, largeRice]);
	});

	it("searches with normalized, bounded filters and exposes no cursor", async () => {
		const result = await searchCatalogForShoppingGuide(requester, { query: " rice ", category: "PANTRY" });

		expect(mocks.list).toHaveBeenCalledWith(requester, { q: "rice", category: "PANTRY", limit: 6 });
		expect(result).toEqual({ products: [rice], hasMore: false });
		expect(result).not.toHaveProperty("nextCursor");
	});

	it("projects product details again before returning them", async () => {
		mocks.get.mockResolvedValue({ ...rice, priceMinor: 499, familyId: "family-private" });
		const result = await getProductForShoppingGuide(requester, { sku: rice.sku });

		expect(result).toEqual(rice);
		expect(JSON.stringify(result)).not.toContain("price");
		expect(JSON.stringify(result)).not.toContain("family");
	});

	it("rejects malformed or ownership-bearing product lookup input", async () => {
		await expect(getProductForShoppingGuide(requester, { sku: "invalid/sku" })).rejects.toThrow();
		await expect(getProductForShoppingGuide(requester, { sku: rice.sku, familyId: "not-accepted" }))
			.rejects.toThrow();
		expect(mocks.get).not.toHaveBeenCalled();
	});

	it("compares only names, categories, and package sizes in requested order", async () => {
		const result = await compareProductsForShoppingGuide(requester, {
			skus: [rice.sku, largeRice.sku],
		});

		expect(mocks.getMany).toHaveBeenCalledWith(requester, [rice.sku, largeRice.sku]);
		expect(result).toEqual({
			products: [rice, largeRice],
			differences: { displayName: false, category: false, sizeLabel: true },
		});
	});

	it.each([
		{ query: "x".repeat(81) },
		{ query: "rice", limit: 13 },
		{ query: "rice", familyId: "not-accepted" },
	])("rejects unsafe or unbounded search input %#", async (input) => {
		await expect(searchCatalogForShoppingGuide(requester, input)).rejects.toThrow();
		expect(mocks.list).not.toHaveBeenCalled();
	});

	it("rejects malformed, duplicate, and excessive comparison input before reading", async () => {
		await expect(compareProductsForShoppingGuide(requester, { skus: [rice.sku, rice.sku] })).rejects.toThrow();
		await expect(compareProductsForShoppingGuide(requester, { skus: [rice.sku] })).rejects.toThrow();
		await expect(compareProductsForShoppingGuide(requester, {
			skus: [rice.sku, largeRice.sku, "third-product", "fourth-product", "fifth-product"],
		})).rejects.toThrow();
		expect(mocks.getMany).not.toHaveBeenCalled();
	});

	it("returns not found when any comparison product is unavailable", async () => {
		mocks.getMany.mockResolvedValue([rice]);

		await expect(compareProductsForShoppingGuide(requester, { skus: [rice.sku, largeRice.sku] }))
			.rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});
