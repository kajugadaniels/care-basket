import { z } from "zod";
import { PRODUCT_CATEGORIES } from "./taxonomy";

export const catalogFiltersSchema = z.strictObject({
	category: z.enum(PRODUCT_CATEGORIES).optional(),
	q: z.string().trim().max(80).regex(/^[^\p{Cc}\p{Cf}<>]*$/u).default(""),
	cursor: z.uuid().optional(),
	// Reserve one row for detecting the next page; every database read stays at 50 or fewer.
	limit: z.int().min(1).max(49).default(24),
});

export function parseCatalogSearchParams(params: Record<string, string | string[] | undefined>) {
	return catalogFiltersSchema.safeParse({
		category: params.category || undefined,
		q: params.q ?? "",
		cursor: params.cursor || undefined,
	});
}
