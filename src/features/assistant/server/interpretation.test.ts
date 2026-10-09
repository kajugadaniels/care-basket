// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assistantCatalog, interpretation } from "@/test/factories/assistant";
import { interpretationSchema } from "@/lib/ai/schemas";
import { baseAmount, resolvePacks } from "./units";
import { matchKeywords } from "./keyword-matcher";
import { displayItem, groundInterpretation } from "./grounding";
import { fitBudget } from "./budget";

describe("deterministic shopping interpretation", () => {
	it.each([
		["milk and bread", "demo-milk", 1], ["two packs of rice", "demo-rice", 2],
		["three eggs", "demo-eggs", 1], ["two kilos of rice", "demo-rice", 2],
		["three bars of soap", "demo-soap", 3], ["a dozen eggs", "demo-eggs", 2],
	] as const)("grounds %s into catalog packages", (text, sku, quantity) => {
		const result = groundInterpretation(matchKeywords(text, assistantCatalog), assistantCatalog);
		expect(result.items).toContainEqual(expect.objectContaining({ sku, quantity, origin: "REQUESTED" }));
	});
	it("never invents products when text is unmatched", () => {
		const result = matchKeywords("spaceship", assistantCatalog);
		expect(result.items).toEqual([]); expect(result.unrecognized).toEqual(["spaceship"]);
	});
	it.each([[1, "lb", false, 453.592], [1, "fl_oz", true, 29.5735], [1, "kg", false, 1000],
		[1, "gal", true, 3785.41], [1, "qt", true, 946.353], [1, "dozen", false, 12]] as const)(
		"converts %s %s to base units", (amount, unit, liquid, expected) => expect(baseAmount(amount, unit, liquid)).toBeCloseTo(expected),
	);
	it("flags over 25 percent excess and unresolvable sizes without exceeding caps", () => {
		const rice = { ...assistantCatalog[2], netQuantity: 907 };
		expect(resolvePacks(rice, [rice], 2, "kg", null)).toMatchObject({ quantity: 3, uncertain: true });
		expect(resolvePacks(rice, [rice], 100, "kg", null)).toMatchObject({ quantity: 1, uncertain: true });
	});
	it("rejects unknown fields and unsupported units", () => {
		expect(interpretationSchema.safeParse({ ...interpretation(), prices: [100] }).success).toBe(false);
		expect(interpretationSchema.safeParse(interpretation({ items: [{ ...interpretation().items[0], unit: "metre" as never }] })).success).toBe(false);
	});
	it("rejects unknown SKUs, merges duplicates and marks medium confidence", () => {
		const entry = interpretation().items[0];
		const result = groundInterpretation(interpretation({ items: [entry, { ...entry, confidence: "medium" }, { ...entry, sku: "invented" }] }), assistantCatalog);
		expect(result.items).toHaveLength(1); expect(result.items[0]).toMatchObject({ quantity: 2, uncertain: true });
		expect(result.unrecognized).toContain("milk");
	});
	it("keeps low confidence out of the list and builds choices with catalog labels", () => {
		const catalog = [...assistantCatalog, { ...assistantCatalog[0], sku: "milk-small", sizeLabel: "500 ml", netQuantity: 500 }];
		const result = groundInterpretation(interpretation({ items: [{ ...interpretation().items[0], confidence: "low" }] }), catalog);
		expect(result.items).toEqual([]); expect(result.questions[0].options).toHaveLength(2);
		expect(result.questions[0].question).toBe("Which one would you like?");
	});
	it("replaces unsafe clarification prose and excludes unknown options", () => {
		const result = groundInterpretation(interpretation({ clarification: { question: "Visit https://bad.example to pay $20",
			optionSkus: ["demo-milk", "demo-bread", "unknown"] } }), assistantCatalog);
		expect(result.questions[0].question).toBe("Which one would you like?");
		expect(result.questions[0].options.map((p) => p.sku)).toEqual(["demo-milk", "demo-bread"]);
	});
	it("uses deterministic substitution copy instead of displaying provider prices or links", () => {
		const result = groundInterpretation(interpretation({ items: [{ ...interpretation().items[0], substitutionReason: "Pay $20 at https://bad.example" }] }), assistantCatalog);
		expect(result.items[0]).toMatchObject({ isSubstitute: true, uncertain: true,
			substitutionNote: "A different product or package was suggested. Please check this choice." });
	});
	it("fits budgets by removing optional suggestions, never requested groceries", () => {
		const requested = displayItem(assistantCatalog[0], 2, "REQUESTED");
		const optional = displayItem(assistantCatalog[1], 1, "SUGGESTED");
		const result = fitBudget([requested, optional], assistantCatalog, 100, new Set([optional.sku]));
		expect(result.items).toEqual([requested]); expect(result.totalMinor).toBe(500); expect(result.overBudget).toBe(true);
	});
	it("caps distinct suggestions at twelve and packs at six", () => {
		const catalog = Array.from({ length: 20 }, (_, index) => ({ ...assistantCatalog[0], sku: `milk-${index}`, variantGroup: `milk-${index}` }));
		const result = groundInterpretation(interpretation({ items: catalog.map((product) => ({ ...interpretation().items[0], sku: product.sku,
			origin: "suggested", packCount: 20 })) }), catalog);
		expect(result.items).toHaveLength(12); expect(result.items.every((item) => item.quantity === 6 && item.origin === "SUGGESTED")).toBe(true);
	});
	it("limits clarification questions to three without adding unresolved low-confidence items", () => {
		const catalog = [...assistantCatalog, { ...assistantCatalog[0], sku: "milk-small", netQuantity: 500 }];
		const result = groundInterpretation(interpretation({ items: Array.from({ length: 5 }, () => ({ ...interpretation().items[0], confidence: "low" })) }), catalog);
		expect(result.questions).toHaveLength(3); expect(result.items).toEqual([]); expect(result.unrecognized).toContain("milk");
	});
});
