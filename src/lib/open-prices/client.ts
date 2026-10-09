import "server-only";
import { z } from "zod";
import { CatalogSourceError, createCatalogHttpClient } from "@/lib/catalog-http/client";
import { openPricesLocationSchema, openPricesObservationSchema, openPricesProductSchema } from "./types";
import type { SourcePage } from "./types";

const pageSchema = z.object({
	items: z.array(z.unknown()).max(50),
	page: z.int().positive(), pages: z.int().nonnegative(), size: z.int().min(1).max(50), total: z.int().nonnegative(),
});
const paginationSchema = z.strictObject({ page: z.int().min(1).max(100), size: z.int().min(1).max(50) });
const barcodeSchema = z.string().regex(/^\d{8,14}$/);
export type PriceQuery = { page: number; size: number; categoryTag?: string; productCode?: string; dateFrom?: string };
export type ProductQuery = { page: number; size: number; code?: string; categoryTag?: string; name?: string };
export type LocationQuery = { page: number; size: number; countryName?: string };

function parsePage<T>(raw: unknown, schema: z.ZodType<T>, expectedPage: number): SourcePage<T> {
	const page = pageSchema.safeParse(raw);
	if (!page.success || page.data.page !== expectedPage || (page.data.pages > 0 && page.data.page > page.data.pages)) {
		throw new CatalogSourceError("INVALID_RESPONSE");
	}
	const items: T[] = [];
	let malformed = 0;
	for (const value of page.data.items) {
		const result = schema.safeParse(value);
		if (result.success) items.push(result.data);
		else malformed += 1;
	}
	return { ...page.data, items, malformed };
}

export function createOpenPricesClient(options: Omit<Parameters<typeof createCatalogHttpClient>[0], "host" | "intervalMs">) {
	const http = createCatalogHttpClient({ ...options, host: "prices.openfoodfacts.org", intervalMs: 1000 });
	return {
		async prices(input: PriceQuery, signal?: AbortSignal) {
			paginationSchema.parse({ page: input.page, size: input.size });
			const query: Record<string, string> = {
				page: String(input.page), size: String(input.size), currency: "USD", type: "PRODUCT",
				duplicate_of__isnull: "true", location__type: "OSM", order_by: "-date",
			};
			if (input.categoryTag) query.product__categories_tags__contains = z.string().max(150).parse(input.categoryTag);
			if (input.productCode) query.product_code = barcodeSchema.parse(input.productCode);
			if (input.dateFrom) query.date__gte = z.iso.date().parse(input.dateFrom);
			return parsePage(await http.get("/api/v1/prices", query, signal), openPricesObservationSchema, input.page);
		},
		async products(input: ProductQuery, signal?: AbortSignal) {
			paginationSchema.parse({ page: input.page, size: input.size });
			const query: Record<string, string> = { page: String(input.page), size: String(input.size) };
			if (input.code) query.code = barcodeSchema.parse(input.code);
			if (input.categoryTag) query.categories_tags__contains = z.string().max(150).parse(input.categoryTag);
			if (input.name) query.product_name__like = z.string().max(80).parse(input.name);
			return parsePage(await http.get("/api/v1/products", query, signal), openPricesProductSchema, input.page);
		},
		async product(code: string, signal?: AbortSignal) {
			const result = openPricesProductSchema.safeParse(await http.get(`/api/v1/products/code/${barcodeSchema.parse(code)}`, {}, signal));
			if (!result.success) throw new CatalogSourceError("INVALID_RESPONSE");
			return result.data;
		},
		async locations(input: LocationQuery, signal?: AbortSignal) {
			paginationSchema.parse({ page: input.page, size: input.size });
			const query: Record<string, string> = { page: String(input.page), size: String(input.size), type: "OSM" };
			if (input.countryName) query.osm_address_country__like = z.string().max(80).parse(input.countryName);
			return parsePage(await http.get("/api/v1/locations", query, signal), openPricesLocationSchema, input.page);
		},
		async location(id: number, signal?: AbortSignal) {
			const result = openPricesLocationSchema.safeParse(await http.get(`/api/v1/locations/${z.int().positive().parse(id)}`, {}, signal));
			if (!result.success || result.data.id !== id) throw new CatalogSourceError("INVALID_RESPONSE");
			return result.data;
		},
	};
}

export type OpenPricesClient = ReturnType<typeof createOpenPricesClient>;
