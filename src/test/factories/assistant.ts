import type { AssistantProduct } from "@/features/assistant/types";
import type { Interpretation } from "@/lib/ai/schemas";

export const assistantCatalog: AssistantProduct[] = [
	{ sku: "demo-milk", displayName: "Milk", category: "DAIRY_EGGS", sizeLabel: "1 litre", imagePath: null,
		variantGroup: "milk", synonyms: ["carton of milk"], netQuantity: 1000, netQuantityUnit: "MILLILITER", priceMinor: 250 },
	{ sku: "demo-bread", displayName: "Bread", category: "BAKERY", sizeLabel: "1 loaf", imagePath: null,
		variantGroup: "bread", synonyms: ["loaf of bread"], netQuantity: 500, netQuantityUnit: "GRAM", priceMinor: 200 },
	{ sku: "demo-rice", displayName: "Rice", category: "PANTRY", sizeLabel: "1 kilogram", imagePath: null,
		variantGroup: "rice", synonyms: ["bag of rice"], netQuantity: 1000, netQuantityUnit: "GRAM", priceMinor: 300 },
	{ sku: "demo-eggs", displayName: "Eggs", category: "DAIRY_EGGS", sizeLabel: "6 eggs", imagePath: null,
		variantGroup: "eggs", synonyms: ["egg"], netQuantity: 6, netQuantityUnit: "COUNT", priceMinor: 300 },
	{ sku: "demo-soap", displayName: "Soap", category: "PERSONAL_CARE", sizeLabel: "1 bar", imagePath: null,
		variantGroup: "soap", synonyms: ["bar of soap"], netQuantity: 1, netQuantityUnit: "COUNT", priceMinor: 100 },
];
export function interpretation(overrides: Partial<Interpretation> = {}): Interpretation {
	return { transcript: null, intent: "list", items: [{ sku: "demo-milk", requestedText: "milk", origin: "requested",
		amount: null, unit: null, packCount: 1, priority: "essential", confidence: "high", substitutionReason: null }],
		occasion: null, statedBudget: null, clarification: null, unrecognized: [], ...overrides };
}
