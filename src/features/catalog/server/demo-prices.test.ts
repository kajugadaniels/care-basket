import { describe, expect, it } from "vitest";
import { decimalToMinor, observationCutoff, suggestDemoPrice } from "./demo-prices";
import type { VerifiedObservation } from "./demo-prices";

function observation(priceMinor: number, sourcePriceId: number, overrides: Partial<VerifiedObservation> = {}): VerifiedObservation {
	return { sourcePriceId, priceMinor, productCode: "012345678905", currency: "USD", observedOn: "2026-10-01", isDiscounted: false, locationId: 7001, locationCountryCode: "US", ...overrides };
}

describe("non-authoritative demo price suggestions", () => {
	it("converts decimal digits to cents and rounds fractional cents", () => {
		expect(decimalToMinor(1.01)).toBe(101);
		expect(decimalToMinor("1.005")).toBe(101);
		expect(decimalToMinor(500)).toBe(50_000);
		expect(decimalToMinor(-1)).toBeNull();
		expect(decimalToMinor(Infinity)).toBeNull();
	});
	it("computes medians in integer cents and records limited basis for one or two", () => {
		expect(suggestDemoPrice([observation(101, 1), observation(300, 2)], "2026-10-09")).toMatchObject({ priceMinor: 201, basis: "OBSERVED_LIMITED", observationCount: 2 });
		expect(suggestDemoPrice([observation(101, 1), observation(300, 2), observation(200, 3)], "2026-10-09")).toMatchObject({ priceMinor: 200, basis: "OBSERVED_MEDIAN" });
	});
	it("excludes discounts, old and future observations and deduplicates source IDs", () => {
		const result = suggestDemoPrice([observation(100, 1), observation(100, 1), observation(1, 2, { isDiscounted: true }), observation(1, 3, { observedOn: "2020-01-01" }), observation(1, 4, { observedOn: "2027-01-01" })], "2026-10-09");
		expect(result).toMatchObject({ priceMinor: 100, observationCount: 1 });
		expect(result).not.toHaveProperty("approvedAt");
		expect(suggestDemoPrice([], "2026-10-09")).toBeNull();
	});
	it("clamps leap-day lookback to a valid date", () => {
		expect(observationCutoff("2024-02-29")).toBe("2022-02-28");
	});
});
