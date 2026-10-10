// @vitest-environment node
import { describe, expect, expectTypeOf, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type { OpenPricesClient } from "@/lib/open-prices/client";
import { discoverCatalog } from "./discovery";
import { makeSourceObservation, makeSourceProduct, TEST_TODAY } from "@/test/factories/catalog";
import { PRODUCT_CATEGORIES } from "../taxonomy";

const options = { today: TEST_TODAY, maxPagesPerCategory: 2, maxCandidates: 10, maxEnrichments: 2 };
function client(prices: OpenPricesClient["prices"]): OpenPricesClient {
	return { prices, product: vi.fn(), products: vi.fn(), locations: vi.fn(), location: vi.fn() };
}

describe("bounded discovery", () => {
	const imageUrl = "https://images.openfoodfacts.org/images/products/001/234/567/8905/front_en.1.400.jpg";

	it("keeps photo-and-price candidates unapproved in ready-only mode", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockResolvedValue({
			items: [makeSourceObservation({ product: makeSourceProduct({ image_url: imageUrl }) })],
			page: 1, pages: 1, size: 50, total: 1, malformed: 0,
		});
		const report = await discoverCatalog(client(prices), vi.fn(), { ...options, categories: ["PANTRY"], readyOnly: true });
		expect(report.candidates).toHaveLength(1);
		expect(report.candidates[0]).toMatchObject({ imageCandidateUrl: imageUrl, approved: false });
		expect(report.candidates[0].suggestedDemoPrice).not.toBeNull();
		expect(report.counts.requiresCuration).toBe(1);
		expect(report.filters).toMatchObject({ categories: ["PANTRY"], readyOnly: true });
	});

	it("holds products without a photo rather than treating placeholders as photos", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockResolvedValue({
			items: [makeSourceObservation()], page: 1, pages: 1, size: 50, total: 1, malformed: 0,
		});
		const report = await discoverCatalog(client(prices), vi.fn().mockResolvedValue(null), { ...options, readyOnly: true });
		expect(report.candidates).toEqual([]);
		expect(report.counts.verifiedProducts).toBe(1);
		expect(report.counts.requiresCuration).toBe(0);
		expect(report.skipReasons["missing-image-candidate"]).toBe(1);
		expect(report.reviewItems[0]).toMatchObject({ status: "HELD_FOR_COMPLETION", reason: "missing-image-candidate" });
	});

	it("holds photographed products whose only observation is discounted", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockResolvedValue({
			items: [makeSourceObservation({ price_is_discounted: true, product: makeSourceProduct({ image_url: imageUrl }) })],
			page: 1, pages: 1, size: 50, total: 1, malformed: 0,
		});
		const report = await discoverCatalog(client(prices), vi.fn(), { ...options, readyOnly: true });
		expect(report.candidates).toEqual([]);
		expect(report.skipReasons["no-recent-nondiscounted-prices"]).toBe(1);
		expect(report.counts.insufficientObservations).toBe(1);
	});

	it("holds a permitted image URL that belongs to another product", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockResolvedValue({
			items: [makeSourceObservation({ product: makeSourceProduct({ image_url: "https://images.openfoodfacts.org/images/products/400/638/133/3931/front_en.1.400.jpg" }) })],
			page: 1, pages: 1, size: 50, total: 1, malformed: 0,
		});
		const report = await discoverCatalog(client(prices), vi.fn(), { ...options, readyOnly: true });
		expect(report.candidates).toEqual([]);
		expect(report.skipReasons["mismatched-image-product"]).toBe(1);
	});

	it("excludes existing barcode and source identities before spending candidate capacity", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockResolvedValue({
			items: [
				makeSourceObservation(),
				makeSourceObservation({ id: 8002, product_code: "036000291452", product: makeSourceProduct({ id: 9002, code: "036000291452" }) }),
				makeSourceObservation({ id: 8003, product_code: "4006381333931", product: makeSourceProduct({ id: 9003, code: "4006381333931" }) }),
			], page: 1, pages: 1, size: 50, total: 3, malformed: 0,
		});
		const enrich = vi.fn().mockResolvedValue(null);
		const report = await discoverCatalog(client(prices), enrich, {
			...options, categories: ["PANTRY"], maxCandidates: 1,
			existingBarcodes: ["0012345678905"], existingSourceProductIds: [9002],
		});
		expect(report.candidates.map((candidate) => candidate.sourceProductId)).toEqual([9003]);
		expect(report.skipReasons["already-curated-product"]).toBe(2);
		expect(enrich.mock.calls.map(([code]) => code)).toEqual(["4006381333931"]);
	});

	it("concentrates requests on a selected category without exceeding its five-request cap", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockImplementation(async (input) => ({
			items: [makeSourceObservation()], page: input.page, pages: 100, size: 50, total: 5000, malformed: 0,
		}));
		await discoverCatalog(client(prices), vi.fn().mockResolvedValue(null), { ...options, categories: ["PANTRY"], maxPagesPerCategory: 5 });
		expect(prices).toHaveBeenCalledTimes(5);
		expect(prices.mock.calls.every(([input]) => input.categoryTag !== "en:fruits")).toBe(true);
	});

	it("rejects empty and duplicate category selections before contacting providers", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>();
		await expect(discoverCatalog(client(prices), vi.fn(), { ...options, categories: [] })).rejects.toThrow();
		await expect(discoverCatalog(client(prices), vi.fn(), { ...options, categories: ["PANTRY", "PANTRY"] })).rejects.toThrow();
		expect(prices).not.toHaveBeenCalled();
	});

	it("reserves candidate space for later categories and reaches beans within the same request cap", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockImplementation(async (input) => {
			const items = input.categoryTag === "en:fruits" ? [
				makeSourceObservation({ product: makeSourceProduct({ categories_tags: ["en:fruits"] }) }),
				makeSourceObservation({ id: 8002, product_code: "036000291452", product: makeSourceProduct({ id: 9002, code: "036000291452", categories_tags: ["en:fruits"] }) }),
			] : input.categoryTag === "en:legumes" ? [
				makeSourceObservation({ id: 8003, product_code: "4006381333931", product: makeSourceProduct({ id: 9003, code: "4006381333931", categories_tags: ["en:legumes"] }) }),
			] : [];
			return { items, page: input.page, pages: 1, size: 50, total: items.length, malformed: 0 };
		});
		const report = await discoverCatalog(client(prices), vi.fn().mockResolvedValue(null), { ...options, maxPagesPerCategory: 5 });
		expect(report.candidates.map((product) => product.category)).toEqual(["PRODUCE", "PANTRY"]);
		expect(report.skipReasons["category-candidate-limit"]).toBe(1);
		expect(report.coverage).toContainEqual({ category: "PANTRY", candidates: 1, imageCandidates: 0 });
		expect(prices.mock.calls.length).toBeLessThanOrEqual(PRODUCT_CATEGORIES.length * 5);
		const enrich = vi.fn().mockResolvedValue(null);
		await discoverCatalog(client(prices), enrich, { ...options, maxPagesPerCategory: 5, maxCandidates: 30 });
		expect(enrich.mock.calls.map(([code]) => code)).toEqual(["012345678905", "4006381333931"]);
	});
	it("deduplicates repeated observations and barcodes and keeps candidates unapproved", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockResolvedValue({ items: [makeSourceObservation(), makeSourceObservation({ id: 8002 })], page: 1, pages: 1, size: 50, total: 2, malformed: 0 });
		const report = await discoverCatalog(client(prices), vi.fn().mockResolvedValue(null), options);
		expect(prices).toHaveBeenCalledTimes(PRODUCT_CATEGORIES.length * 2);
		expect(report.candidates).toHaveLength(1);
		expectTypeOf(report.candidates[0]).not.toBeAny();
		expectTypeOf(report.candidates[0].imageCandidateUrl).toEqualTypeOf<string | null>();
		expectTypeOf(report.candidates[0].approved).toEqualTypeOf<false>();
		expect(report.coverage).toContainEqual({ category: "PANTRY", candidates: 1, imageCandidates: 0 });
		expect(report.candidates[0]).toMatchObject({ approved: false, verification: expect.any(Array) });
		expect(report.candidates[0].verification).toHaveLength(2);
		expect(report.candidates[0].suggestedDemoPrice).toMatchObject({ basis: "OBSERVED_LIMITED", observationCount: 2 });
		expect(report.observationsComplete).toBe(false);
		expect(report.reviewItems[0]).toMatchObject({ sourceProductId: 9001, status: "VERIFIED_REQUIRES_CURATION" });
	});
	it("counts exclusions, incomplete products and insufficient observations separately", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockResolvedValue({
			items: [makeSourceObservation({ product: makeSourceProduct({ product_name: "Wine" }) }), makeSourceObservation({ id: 8002, price_is_discounted: true })], page: 1, pages: 1, size: 50, total: 2, malformed: 1,
		});
		const report = await discoverCatalog(client(prices), vi.fn(), { ...options, maxEnrichments: 0 });
		expect(report.counts.excluded).toBe(1);
		expect(report.skipReasons["excluded-policy"]).toBe(1);
		expect(report.counts.malformed).toBe(PRODUCT_CATEGORIES.length * 2);
	});
	it("never enriches or attributes observations from outside the U.S.", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockResolvedValue({ items: [makeSourceObservation({ location: { id: 7001, type: "OSM", osm_address_country_code: "CA" } })], page: 1, pages: 1, size: 50, total: 1, malformed: 0 });
		const enrich = vi.fn();
		const report = await discoverCatalog(client(prices), enrich, options);
		expect(report.candidates).toEqual([]);
		expect(enrich).not.toHaveBeenCalled();
	});
	it("stops at the configured page cap even when the source advertises many pages", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockImplementation(async (input) => ({ items: [makeSourceObservation()], page: input.page, pages: 100, size: 50, total: 5000, malformed: 0 }));
		await discoverCatalog(client(prices), vi.fn().mockResolvedValue(null), options);
		expect(prices).toHaveBeenCalledTimes(PRODUCT_CATEGORIES.length * 2);
	});
	it("rejects a source failure before producing a replacement report", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockRejectedValue(new Error("source unavailable"));
		await expect(discoverCatalog(client(prices), vi.fn(), options)).rejects.toThrow();
	});
});
