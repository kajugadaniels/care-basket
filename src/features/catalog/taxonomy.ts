export const PRODUCT_CATEGORIES = [
	"PRODUCE", "DAIRY_EGGS", "BAKERY", "PANTRY", "BREAKFAST", "MEAT_SEAFOOD",
	"FROZEN", "SNACKS", "BEVERAGES", "HOUSEHOLD", "PERSONAL_CARE",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// Specific categories come first: frozen vegetables must not become produce.
export const CATEGORY_TAGS: Record<ProductCategory, readonly string[]> = {
	FROZEN: ["en:frozen-foods", "en:frozen-vegetables", "en:ice-creams"],
	BREAKFAST: ["en:breakfast-cereals", "en:rolled-oats"],
	DAIRY_EGGS: ["en:milks", "en:eggs", "en:cheeses", "en:yogurts", "en:dairies"],
	BAKERY: ["en:breads", "en:bakery-products"],
	MEAT_SEAFOOD: ["en:meats", "en:fishes", "en:seafood"],
	PRODUCE: ["en:fruits", "en:vegetables", "en:bananas"],
	PANTRY: ["en:rices", "en:pastas", "en:canned-foods", "en:flours", "en:legumes"],
	SNACKS: ["en:snacks", "en:biscuits", "en:crackers"],
	BEVERAGES: ["en:waters", "en:fruit-juices", "en:teas", "en:coffees"],
	HOUSEHOLD: ["en:toilet-paper", "en:paper-towels"],
	PERSONAL_CARE: ["en:soaps", "en:shampoos", "en:toothpastes"],
};
