// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
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
	it("deduplicates repeated observations and barcodes and keeps candidates unapproved", async () => {
		const prices = vi.fn<OpenPricesClient["prices"]>().mockResolvedValue({ items: [makeSourceObservation(), makeSourceObservation({ id: 8002 })], page: 1, pages: 1, size: 50, total: 2, malformed: 0 });
		const report = await discoverCatalog(client(prices), vi.fn().mockResolvedValue(null), options);
		expect(prices).toHaveBeenCalledTimes(PRODUCT_CATEGORIES.length);
		expect(report.candidates).toHaveLength(1);
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
		expect(report.counts.malformed).toBe(PRODUCT_CATEGORIES.length);
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
