import type { ProductCategory } from "./taxonomy";

export type CatalogFilters = { category?: ProductCategory; q: string; cursor?: string; limit: number };
export type CatalogSearchParams = Promise<Record<string, string | string[] | undefined>>;
export type CatalogProductDto = {
	sku: string;
	displayName: string;
	category: ProductCategory;
	sizeLabel: string;
	imagePath: string | null;
};
export type ManagerProductDto = CatalogProductDto & {
	brand: string | null;
	demoPrice: { priceMinor: number; currency: string };
	attribution: string;
	imageAttribution: string | null;
	imageSourceUrl: string | null;
	imageProductUrl: string | null;
};
export type CatalogPage<T> = { products: T[]; nextCursor: string | null };
