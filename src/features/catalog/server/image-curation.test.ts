// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { makeCuratedCatalog } from "@/test/factories/catalog";
import { productPublicId } from "@/lib/cloudinary/catalog-images";
import { validateSeedCatalog } from "./curated-schema";
import { planCatalogImages, renderImageAttribution } from "./image-curation";

function fixture() {
	const catalog = makeCuratedCatalog();
	Object.assign(catalog.products[0], {
		source: "OPEN_PRICES", barcode: "0012345678905", sourceProductId: 9001,
		sourceProductCode: "012345678905", sourceSystem: "off", isChildSuitable: false,
		verification: [{ sourcePriceId: 8001, productCode: "012345678905", priceMinor: 349,
			currency: "USD", observedOn: "2026-10-01", isDiscounted: false, locationId: 7001, locationCountryCode: "US" }],
	});
	const candidate = {
		sourceProductId: 9001, sourceProductCode: "012345678905", sourceSystem: "off",
		imageCandidateUrl: "https://images.openfoodfacts.org/images/products/001/234/567/8905/front_en.1.400.jpg",
		imageProductUrl: "https://world.openfoodfacts.org/product/012345678905",
		suggestedDemoPrice: { priceMinor: 9999 },
	};
	return { catalog, candidate, report: { version: 1, candidates: [candidate] } };
}

describe("curated product photo plan", () => {
	it("keeps attribution usable after the local Cloudinary copies are removed", () => {
		const { catalog, report } = fixture();
		const image = planCatalogImages(catalog, report)[0].image;
		const sha256 = "a".repeat(64);
		image.cloudinary = { cloudName: "fixture-cloud", publicId: productPublicId(catalog.products[0].sku, sha256),
			sha256, version: 123, format: "jpg" };
		catalog.products[0].image = image;
		const attribution = renderImageAttribution(catalog);
		expect(attribution).not.toContain(image.path);
		expect(attribution).toContain(`[example-demo-rice](${image.productUrl})`);
		expect(attribution).toContain(image.sourceUrl);
		expect(attribution).toContain("Open Food Facts contributors");
		expect(attribution).toContain("https://creativecommons.org/licenses/by-sa/3.0/");
		expect(attribution).toContain("Cloudinary");
	});
	it("links matching source photos to local paths without importing prices or safety flags", () => {
		const { catalog, report } = fixture();
		const before = structuredClone(catalog);
		const plan = planCatalogImages(catalog, report);
		expect(plan).toEqual([{ sku: "example-demo-rice", image: {
			path: "/products/example-demo-rice.jpg",
			sourceUrl: report.candidates[0].imageCandidateUrl,
			productUrl: report.candidates[0].imageProductUrl,
			license: "CC BY-SA 3.0", attribution: "Open Food Facts contributors",
		} }]);
		expect(catalog).toEqual(before);
		catalog.products[0].image = plan[0].image;
		expect(validateSeedCatalog(catalog, new Date("2026-10-09T12:00:00Z"))).toEqual(catalog);
		expect(catalog.products[0].demoPrice.priceMinor).toBe(349);
		expect(catalog.products[0].isChildSuitable).toBe(false);
	});
	it.each([
		{ sourceProductId: 9999 },
		{ sourceProductCode: "8809316810561" },
		{ sourceSystem: "obf" },
		{ imageCandidateUrl: null },
		{ imageCandidateUrl: "https://retailer.example/image.jpg" },
		{ imageCandidateUrl: "https://images.openfoodfacts.org/images/products/880/931/681/0561/front_en.1.400.jpg" },
		{ imageProductUrl: "https://world.openfoodfacts.org/product/8809316810561" },
	])("keeps a placeholder for mismatched or unavailable provenance: %j", (change) => {
		const { catalog, candidate } = fixture();
		expect(planCatalogImages(catalog, { version: 1, candidates: [{ ...candidate, ...change }] })).toEqual([]);
	});
	it("does not replace previously curated images on a rerun", () => {
		const { catalog, report } = fixture();
		catalog.products[0].image = planCatalogImages(catalog, report)[0].image;
		expect(planCatalogImages(catalog, report)).toEqual([]);
	});
	it("does not invent images or source claims for manual demo products", () => {
		const { report } = fixture();
		expect(planCatalogImages(makeCuratedCatalog(), report)).toEqual([]);
	});
	it("rejects duplicate and malformed candidates instead of choosing silently", () => {
		const { catalog, candidate } = fixture();
		expect(() => planCatalogImages(catalog, { version: 1, candidates: [candidate, candidate] })).toThrow(/Duplicate/);
		expect(() => planCatalogImages(catalog, { version: 1, candidates: [{ ...candidate, imageCandidateUrl: 42 }] })).toThrow();
	});
	it("generates attribution only for photos actually included in the curated catalog", () => {
		const { catalog, report } = fixture();
		expect(renderImageAttribution(catalog)).not.toContain("example-demo-rice");
		catalog.products[0].image = planCatalogImages(catalog, report)[0].image;
		const attribution = renderImageAttribution(catalog);
		expect(attribution).toContain("/products/example-demo-rice.jpg");
		expect(attribution).toContain(report.candidates[0].imageCandidateUrl);
		expect(attribution).toContain(report.candidates[0].imageProductUrl);
		expect(attribution).toContain("Open Food Facts contributors");
		expect(attribution).toContain("https://creativecommons.org/licenses/by-sa/3.0/");
	});
});
