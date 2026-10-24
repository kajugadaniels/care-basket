import { z } from "zod";
import { PRODUCT_CATEGORIES } from "./taxonomy";

export const catalogSkuSchema = z.string().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const catalogSkusSchema = z.array(catalogSkuSchema).min(1).max(12)
	.refine((skus) => new Set(skus).size === skus.length, "Choose each product once.");

export const catalogFiltersSchema = z.strictObject({
	category: z.enum(PRODUCT_CATEGORIES).optional(),
	q: z.string().trim().max(80).regex(/^[^\p{Cc}\p{Cf}<>]*$/u).default(""),
	cursor: z.uuid().optional(),
	before: z.uuid().optional(),
	// Reserve one row for detecting the next page; every database read stays at 50 or fewer.
	limit: z.int().min(1).max(49).default(24),
}).refine((filters) => !(filters.cursor && filters.before), { message: "Choose one pagination direction.", path: ["before"] });

export function parseCatalogSearchParams(params: Record<string, string | string[] | undefined>) {
	return catalogFiltersSchema.safeParse({
		category: params.category || undefined,
		q: params.q ?? "",
		cursor: params.cursor || undefined,
		before: params.before || undefined,
	});
}

export const requesterPageSchema = z.strictObject({
	category: z.enum(PRODUCT_CATEGORIES).optional(),
	q: z.string().trim().max(80).regex(/^[^\p{Cc}\p{Cf}<>]*$/u).default(""),
	cursor: z.uuid(),
});
