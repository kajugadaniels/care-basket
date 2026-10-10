// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { curatedCatalogSchema, validateSeedCatalog } from "./curated-schema";
import { makeCuratedCatalog } from "@/test/factories/catalog";

const now = new Date("2026-10-10T23:59:59Z");
const committedCatalog: unknown = JSON.parse(readFileSync(resolve("prisma/catalog/catalog.us.json"), "utf8"));

const approvedExpansionIds = new Set([
	94408, 94385, 92194, 94414, 1438096,
	41477, 120478, 1118890, 185638, 1270908, 1270892, 466987, 792093, 1080347,
	90374, 1378899, 805947, 13645, 13633, 1130722,
	3475860, 1134820, 3264, 38735, 2151930, 197212,
	4701336, 56513, 97984, 56520, 69345,
	147198, 1430378, 38991, 1304012, 849617,
]);

describe("reviewed catalog contract", () => {
	it("accepts the 150 approved products in the committed seed catalog", () => {
		const catalog = validateSeedCatalog(committedCatalog, now);

		expect(catalog.products).toHaveLength(150);
		expect(catalog.products.every((product) => product.demoPrice.approved)).toBe(true);
		expect(catalog.products.every((product) => !product.isChildSuitable)).toBe(true);
	});
	it("includes exactly the 36 approved additions with evidence and restricted child visibility", () => {
		const catalog = validateSeedCatalog(committedCatalog, now);
		const additions = catalog.products.filter((product) => product.sourceProductId !== null && approvedExpansionIds.has(product.sourceProductId));

		expect(additions).toHaveLength(36);
		for (const product of additions) {
			expect(product.source).toBe("OPEN_PRICES");
			expect(product.demoPrice.approved).toBe(true);
			expect(product.demoPrice.approvedAt).toBe("2026-10-10T06:44:17Z");
			expect(product.demoPrice.basis).not.toBe("MANUAL_DEMO");
			expect(product.verification.length).toBeGreaterThan(0);
			expect(product.isChildSuitable).toBe(false);
		}
	});
	it("preserves the 32 newly approved products and their reviewed demo prices", () => {
		const approvedPrices = new Map<number, number>([
			[2094258, 699],
			[1548114, 1679],
			[1128508, 235],
			[2321416, 349],
			[2102982, 215],
			[3687815, 349],
			[41260, 432],
			[13639, 649],
			[2249575, 499],
			[3291331, 549],
			[71890, 599],
			[4276652, 699],
			[71894, 619],
			[94406, 1099],
			[2870895, 599],
			[1861034, 599],
			[197245, 1295],
			[117343, 824],
			[1951785, 999],
			[654592, 456],
			[24296, 399],
			[92367, 999],
			[1201548, 499],
			[1019070, 699],
			[1237227, 199],
			[92368, 899],
			[1237027, 499],
			[91683, 199],
			[92363, 844],
			[94379, 899],
			[2375859, 749],
			[13168, 199],
		]);
		const catalog = validateSeedCatalog(committedCatalog, now);
		const additions = catalog.products.filter((product) => product.sourceProductId !== null && approvedPrices.has(product.sourceProductId));

		expect(additions).toHaveLength(32);
		for (const product of additions) {
			expect(product.source).toBe("OPEN_PRICES");
			expect(product.demoPrice).toMatchObject({
				currency: "USD", approved: true, approvedAt: "2026-10-10T12:57:10Z",
				priceMinor: approvedPrices.get(product.sourceProductId ?? 0),
			});
			expect(product.demoPrice.basis).not.toBe("MANUAL_DEMO");
			expect(product.verification.length).toBeGreaterThan(0);
			expect(product.variantGroup).not.toBe("");
			expect(product.synonyms).toContain(product.displayName.toLowerCase());
			expect(product.isChildSuitable).toBe(false);
		}
	});
	it("includes exactly the final 32 approved products with reviewed names and prices", () => {
		const reviewed = new Map<number, { displayName: string; priceMinor: number; category: string }>([
			[1246788, { displayName: "Long Grain Brown Rice", priceMinor: 299, category: "PANTRY" }],
			[1212816, { displayName: "White Jasmine Rice", priceMinor: 1099, category: "PANTRY" }],
			[92219, { displayName: "California White Basmati Rice", priceMinor: 899, category: "PANTRY" }],
			[2872959, { displayName: "Ready Rice Basmati", priceMinor: 599, category: "PANTRY" }],
			[1522825, { displayName: "Elbow Macaroni", priceMinor: 189, category: "PANTRY" }],
			[2255039, { displayName: "Fettuccine", priceMinor: 219, category: "PANTRY" }],
			[1249729, { displayName: "Pappardelle", priceMinor: 339, category: "PANTRY" }],
			[1210387, { displayName: "Spinach & Ricotta Ravioli", priceMinor: 689, category: "PANTRY" }],
			[1316707, { displayName: "Chickpea Fusilli Pasta", priceMinor: 399, category: "PANTRY" }],
			[30963, { displayName: "Shin Ramyun", priceMinor: 169, category: "PANTRY" }],
			[67896, { displayName: "Vegetable Beef Condensed Soup", priceMinor: 299, category: "PANTRY" }],
			[952023, { displayName: "Cream of Mushroom Soup", priceMinor: 319, category: "PANTRY" }],
			[1194133, { displayName: "Cream of Chicken Soup", priceMinor: 319, category: "PANTRY" }],
			[832431, { displayName: "Organic Diced Tomatoes", priceMinor: 479, category: "PANTRY" }],
			[176952, { displayName: "Albacore Tuna", priceMinor: 699, category: "MEAT_SEAFOOD" }],
			[4170463, { displayName: "Mandarin oranges", priceMinor: 149, category: "PANTRY" }],
			[40082, { displayName: "Crushed Pineapple", priceMinor: 199, category: "PANTRY" }],
			[2555368, { displayName: "All-purpose Flour", priceMinor: 1649, category: "PANTRY" }],
			[82102, { displayName: "Whole Wheat Flour", priceMinor: 639, category: "PANTRY" }],
			[82101, { displayName: "Bread Flour", priceMinor: 949, category: "PANTRY" }],
			[1176062, { displayName: "Organic Brown Rice Flour", priceMinor: 199, category: "PANTRY" }],
			[1316589, { displayName: "White Rice Flour", priceMinor: 499, category: "PANTRY" }],
			[785845, { displayName: "Tapioca Flour", priceMinor: 499, category: "PANTRY" }],
			[1239547, { displayName: "Natural Almond Flour", priceMinor: 1524, category: "PANTRY" }],
			[15632, { displayName: "Self-Rising Flour", priceMinor: 699, category: "PANTRY" }],
			[79074, { displayName: "Lentils", priceMinor: 249, category: "PANTRY" }],
			[788046, { displayName: "Cuban Black Beans", priceMinor: 659, category: "PANTRY" }],
			[3254722, { displayName: "Saucy Coconut Curry Chickpeas", priceMinor: 579, category: "PANTRY" }],
			[2429133, { displayName: "Mexican Black Beans", priceMinor: 559, category: "PANTRY" }],
			[1122910, { displayName: "Ranch Style Beans", priceMinor: 199, category: "PANTRY" }],
			[1322498, { displayName: "Unsalted Dry-Roasted Peanuts", priceMinor: 379, category: "PANTRY" }],
			[38960, { displayName: "Creamy Roasted Honey Nut Peanut Butter Spread", priceMinor: 474, category: "PANTRY" }],
		]);
		const catalog = validateSeedCatalog(committedCatalog, now);
		const additions = catalog.products.filter((product) => product.sourceProductId !== null && reviewed.has(product.sourceProductId));

		expect(additions).toHaveLength(32);
		for (const product of additions) {
			const approved = reviewed.get(product.sourceProductId ?? 0);
			expect(product.displayName).toBe(approved?.displayName);
			expect(product.category).toBe(approved?.category);
			expect(product.demoPrice).toMatchObject({
				currency: "USD", approved: true, approvedAt: "2026-10-10T14:27:55Z",
				priceMinor: approved?.priceMinor,
			});
			expect(product.source).toBe("OPEN_PRICES");
			expect(product.demoPrice.basis).not.toBe("MANUAL_DEMO");
			expect(product.verification.length).toBeGreaterThan(0);
			expect(product.variantGroup).not.toBe("");
			expect(product.synonyms).toContain(product.displayName.toLowerCase());
			expect(product.isChildSuitable).toBe(false);
		}
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
