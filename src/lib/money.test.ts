import { describe, expect, it } from "vitest";
import { lineTotalMinor, MAX_USD_MINOR, requireUsd, subtotalMinor, usdDecimal, usdMinor } from "./money";

describe("integer USD amounts", () => {
	it.each<[number, string]>([[0, "0.00"], [1, "0.01"], [199, "1.99"], [1250, "12.50"], [10000, "100.00"], [MAX_USD_MINOR, "21474836.47"]])(
		"round-trips %s cents without floating-point price multiplication", (minor, decimal) => {
			expect(usdDecimal(minor)).toBe(decimal);
			expect(usdMinor(decimal)).toBe(minor);
		});
	it.each(["1", "1.0", "1.001", "01.00", "-1.00", "+1.00", "1e2", " 1.00", "1,000.00", "NaN", "21474836.48"])(
		"rejects noncanonical or overflowing decimal %s", (amount) => expect(() => usdMinor(amount)).toThrow());
	it.each([-1, 1.5, NaN, Infinity, MAX_USD_MINOR + 1, Number.MAX_SAFE_INTEGER])("rejects invalid cents %s", (amount) => {
		expect(() => usdDecimal(amount)).toThrow();
	});
	it("requires USD and validates quantity, basket size, and every intermediate total", () => {
		expect(() => requireUsd("EUR")).toThrow();
		expect(() => usdMinor("1.00", "usd")).toThrow();
		expect(lineTotalMinor(199, 3)).toBe(597);
		expect(subtotalMinor([{ quantity: 3, unitPriceMinor: 199 }, { quantity: 2, unitPriceMinor: 1250 }])).toBe(3097);
		for (const quantity of [0, -1, 1.5, 21]) expect(() => lineTotalMinor(100, quantity)).toThrow();
		expect(() => lineTotalMinor(MAX_USD_MINOR, 2)).toThrow();
		expect(() => subtotalMinor([])).toThrow();
		expect(() => subtotalMinor(Array.from({ length: 31 }, () => ({ quantity: 1, unitPriceMinor: 1 })))).toThrow();
		expect(() => subtotalMinor([{ quantity: 1, unitPriceMinor: MAX_USD_MINOR }, { quantity: 1, unitPriceMinor: 1 }])).toThrow();
	});
});
