import type { ProductCategory } from "@/features/catalog/taxonomy";

// Category prefiltering is deterministic and never relaxes active/product-suitability checks.
const CATEGORY_WORDS: Record<ProductCategory, readonly string[]> = {
	PRODUCE: ["fruit", "vegetable", "apple", "banana", "berries", "tomato", "potato"],
	DAIRY_EGGS: ["milk", "egg", "cheese", "yogurt", "butter"], BAKERY: ["bread", "loaf", "bakery"],
	PANTRY: ["rice", "pasta", "beans", "flour", "canned"], BREAKFAST: ["breakfast", "cereal", "oat"],
	MEAT_SEAFOOD: ["meat", "chicken", "beef", "fish", "seafood"], FROZEN: ["frozen", "ice cream"],
	SNACKS: ["snack", "cracker", "biscuit", "cookie"], BEVERAGES: ["water", "juice", "tea", "coffee", "drink"],
	HOUSEHOLD: ["household", "paper", "towel", "cleaner"], PERSONAL_CARE: ["soap", "shampoo", "toothpaste"],
};
export function contextCategories(text: string): ProductCategory[] {
	const words = text.toLowerCase();
	return (Object.keys(CATEGORY_WORDS) as ProductCategory[]).filter((category) =>
		CATEGORY_WORDS[category].some((word) => new RegExp(`\\b${word}s?\\b`).test(words)));
}
