// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assistantCatalog } from "@/test/factories/assistant";
import { shoppingCases } from "./__fixtures__/shopping-cases";
import { matchKeywords } from "./keyword-matcher";
import { groundInterpretation } from "./grounding";

describe("40 fictional shopping evaluations", () => {
	it.each(shoppingCases)("locally matches %s without inventing groceries", (text, sku) => {
		const raw = matchKeywords(text, assistantCatalog);
		if (sku) expect(raw.items.map((item) => item.sku)).toContain(sku);
		else { expect(raw.items).toEqual([]); expect(raw.unrecognized.length).toBeGreaterThan(0); }
		const result = groundInterpretation(raw, assistantCatalog);
		expect(result.items.length).toBeLessThanOrEqual(30); expect(result.questions.length).toBeLessThanOrEqual(3);
		for (const item of result.items) {
			expect(assistantCatalog.some((product) => product.sku === item.sku)).toBe(true);
			expect(item.quantity).toBeGreaterThanOrEqual(1); expect(item.quantity).toBeLessThanOrEqual(20);
		}
	});
});
