import "server-only";
import { z } from "zod";
import { CatalogSourceError, createCatalogHttpClient } from "@/lib/catalog-http/client";

const metadataSchema = z.object({
	code: z.string().regex(/^\d{8,14}$/),
	product_name: z.string().max(500).nullish(),
	brands: z.string().max(500).nullish(),
	categories_tags: z.array(z.string().max(150)).max(200).default([]),
	product_quantity: z.union([z.number().finite(), z.string().max(30)]).nullish(),
	product_quantity_unit: z.string().max(40).nullish(),
	quantity: z.string().max(150).nullish(),
	image_front_url: z.string().max(1000).nullish(),
});
const responseSchema = z.object({ status: z.int(), product: metadataSchema.optional() });
export type FoodFactsMetadata = z.infer<typeof metadataSchema>;

export function createOpenFoodFactsClient(options: Omit<Parameters<typeof createCatalogHttpClient>[0], "host" | "intervalMs">) {
	const http = createCatalogHttpClient({ ...options, host: "world.openfoodfacts.org", intervalMs: 6000 });
	return {
		async product(code: string, signal?: AbortSignal): Promise<FoodFactsMetadata | null> {
			z.string().regex(/^\d{8,14}$/).parse(code);
			const raw = await http.get(`/api/v2/product/${code}`, {
				fields: "code,product_name,brands,categories_tags,product_quantity,product_quantity_unit,quantity,image_front_url",
			}, signal);
			const result = responseSchema.safeParse(raw);
			if (!result.success) throw new CatalogSourceError("INVALID_RESPONSE");
			if (result.data.status === 0) return null;
			if (result.data.status !== 1 || !result.data.product || result.data.product.code !== code) {
				throw new CatalogSourceError("INVALID_RESPONSE");
			}
			return result.data.product;
		},
	};
}
