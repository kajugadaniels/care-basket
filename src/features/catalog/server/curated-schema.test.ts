// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { curatedCatalogSchema, validateSeedCatalog } from "./curated-schema";
import { makeCuratedCatalog } from "@/test/factories/catalog";

const now = new Date("2026-10-09T12:00:00Z");
const committedCatalog: unknown = JSON.parse(readFileSync(resolve("prisma/catalog/catalog.us.json"), "utf8"));

describe("reviewed catalog contract", () => {
	it("accepts the 50 approved products in the committed seed catalog", () => {
		const catalog = validateSeedCatalog(committedCatalog, now);

		expect(catalog.products).toHaveLength(50);
		expect(catalog.products.every((product) => product.demoPrice.approved)).toBe(true);
		expect(catalog.products.every((product) => product.image === null && !product.isChildSuitable)).toBe(true);
	});
	it("still refuses to seed an empty catalog", () => {
		const emptyCatalog = { ...makeCuratedCatalog(), products: [] };

		expect(curatedCatalogSchema.safeParse(emptyCatalog).success).toBe(true);
		expect(() => validateSeedCatalog(emptyCatalog, now)).toThrow(/empty/);
	});
	it("accepts explicitly approved manual demo products with no invented source references", () => {
		expect(validateSeedCatalog(makeCuratedCatalog(), now).products[0].demoPrice.priceMinor).toBe(349);
	});
	it.each([
		{ currency: "EUR" }, { priceMinor: 3.49 }, { approved: false }, { approvedAt: undefined },
		{ approvedAt: "2027-01-01T00:00:00Z" }, { basis: "OBSERVED_MEDIAN" },
	])("rejects an incomplete or unapproved price %j", (overrides) => {
		const catalog = makeCuratedCatalog();
		const raw = { ...catalog, products: [{ ...catalog.products[0], demoPrice: { ...catalog.products[0].demoPrice, ...overrides } }] };
		expect(() => validateSeedCatalog(raw, now)).toThrow();
	});
	it("rejects duplicate SKU and barcode identities", () => {
		const catalog = makeCuratedCatalog();
		catalog.products.push({ ...catalog.products[0] });
		expect(() => validateSeedCatalog(catalog, now)).toThrow();
		catalog.products[1].sku = "another-rice";
		catalog.products[0].barcode = "0012345678905";
		catalog.products[1].barcode = "0012345678905";
		expect(() => validateSeedCatalog(catalog, now)).toThrow();
	});
	it("rejects an Open Prices claim without U.S. evidence", () => {
		const catalog = makeCuratedCatalog();
		catalog.products[0].source = "OPEN_PRICES";
		expect(() => validateSeedCatalog(catalog, now)).toThrow();
	});
	it("accepts matching reviewed observations but never substitutes them for price approval", () => {
		const catalog = makeCuratedCatalog();
		const product = catalog.products[0];
		Object.assign(product, {
			source: "OPEN_PRICES", barcode: "0012345678905", sourceProductId: 9001,
			sourceProductCode: "012345678905", sourceSystem: "off",
			verification: [{ sourcePriceId: 8001, productCode: "012345678905", priceMinor: 349,
				currency: "USD", observedOn: "2026-10-01", isDiscounted: false, locationId: 7001, locationCountryCode: "US" }],
		});
		Object.assign(product.demoPrice, { basis: "OBSERVED_LIMITED", observationCount: 1, observedFrom: "2026-10-01", observedTo: "2026-10-01" });
		expect(validateSeedCatalog(catalog, now).products).toHaveLength(1);
		product.demoPrice.priceMinor = 350;
		expect(() => validateSeedCatalog(catalog, now)).toThrow();
		Object.assign(product.demoPrice, { priceMinor: 349, approved: false });
		expect(() => validateSeedCatalog(catalog, now)).toThrow();
	});
	it("rejects excluded products, unknown fields and invalid image licensing", () => {
		const catalog = makeCuratedCatalog();
		catalog.products[0].displayName = "Bleach";
		expect(() => validateSeedCatalog(catalog, now)).toThrow();
		expect(() => validateSeedCatalog({ ...makeCuratedCatalog(), owner: "private" }, now)).toThrow();
		const raw = makeCuratedCatalog();
		expect(() => validateSeedCatalog({ ...raw, products: [{ ...raw.products[0], image: { path: "/products/example-demo-rice.jpg", sourceUrl: "https://retailer.example/image.jpg", license: "unknown" } }] }, now)).toThrow();
	});
});
