import { z } from "zod";

const nullableText = (maximum: number) => z.string().max(maximum).nullish();
export const openPricesProductSchema = z.object({
	id: z.int().positive(),
	code: z.string().max(64),
	source: z.enum(["off", "obf", "opf", "opff", ""]).nullish(),
	product_name: nullableText(500),
	brands: nullableText(500),
	categories_tags: z.array(z.string().max(150)).max(200).default([]),
	image_url: nullableText(1000),
	product_quantity: z.int().nullish(),
	product_quantity_unit: nullableText(40),
	quantity: nullableText(150),
	price_count: z.int().nonnegative().nullish(),
});

export const openPricesLocationSchema = z.object({
	id: z.int().positive(),
	type: z.enum(["OSM", "ONLINE"]),
	osm_address_country_code: nullableText(10),
});

export const openPricesObservationSchema = z.object({
	id: z.int().positive(),
	type: z.enum(["PRODUCT", "CATEGORY"]),
	product_code: nullableText(64),
	product: openPricesProductSchema.nullish(),
	location_id: z.int().positive().nullish(),
	location: openPricesLocationSchema.nullish(),
	duplicate_of: z.int().nullish(),
	currency: nullableText(10),
	price: z.number().finite().nullable(),
	price_per: z.enum(["UNIT", "KILOGRAM", ""]).nullish(),
	price_is_discounted: z.boolean(),
	date: nullableText(20),
});

// Unknown fields are stripped: contributor names, comments, proofs and receipts never leave the adapter.
export type OpenPricesProduct = z.infer<typeof openPricesProductSchema>;
export type OpenPricesLocation = z.infer<typeof openPricesLocationSchema>;
export type OpenPricesObservation = z.infer<typeof openPricesObservationSchema>;
export type SourcePage<T> = { items: T[]; page: number; pages: number; size: number; total: number; malformed: number };
