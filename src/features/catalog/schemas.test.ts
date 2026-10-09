import { describe, expect, it } from "vitest";
import { catalogFiltersSchema, parseCatalogSearchParams } from "./schemas";

describe("catalog inputs", () => {
	it("defaults to a bounded first page and trims search text", () => {
		expect(catalogFiltersSchema.parse({})).toEqual({ q: "", limit: 24 });
		expect(parseCatalogSearchParams({ q: " rice ", category: "PANTRY" })).toMatchObject({ success: true, data: { q: "rice", category: "PANTRY" } });
	});
	it.each([{ category: "INVALID" }, { q: ["rice", "milk"] }, { q: "a".repeat(81) }, { cursor: "bad" }, { q: "<script>" }])("rejects malformed URL input %j", (input) => {
		expect(parseCatalogSearchParams(input).success).toBe(false);
	});
	it("rejects ownership IDs and client prices in service input", () => {
		expect(catalogFiltersSchema.safeParse({ familyId: "someone-else", priceMinor: 1 }).success).toBe(false);
	});
});
