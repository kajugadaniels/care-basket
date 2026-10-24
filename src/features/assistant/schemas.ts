import { z } from "zod";
import { catalogSkuSchema } from "@/features/catalog/schemas";
import { PRODUCT_CATEGORIES } from "@/features/catalog/taxonomy";

const shoppingGuideSearchTextSchema = z.string().trim().max(80).regex(/^[^\p{Cc}\p{Cf}<>]*$/u);

export const shoppingGuideCatalogSearchSchema = z.strictObject({
	query: shoppingGuideSearchTextSchema.default(""),
	category: z.enum(PRODUCT_CATEGORIES).optional(),
	limit: z.int().min(1).max(12).default(6),
});

export const shoppingGuideProductSchema = z.strictObject({
	sku: catalogSkuSchema,
});

export const shoppingGuideComparisonSchema = z.strictObject({
	skus: z.array(catalogSkuSchema).min(2).max(4)
		.refine((skus) => new Set(skus).size === skus.length, "Choose each product once."),
});

export const reviewPageSchema = z.strictObject({
	reviewId: z.uuid(),
	offset: z.int().min(0).max(192).multipleOf(12).default(0),
});
export const textRequestSchema = z.strictObject({
	text: z.string().trim().min(1).max(500).regex(/^[^\p{Cc}\p{Cf}<>]*$/u),
});
export const aiPreferenceSchema = z.strictObject({ profileId: z.uuid(), enabled: z.boolean(), consent: z.boolean() })
	.refine((input) => !input.enabled || input.consent, "Confirm consent separately.");
