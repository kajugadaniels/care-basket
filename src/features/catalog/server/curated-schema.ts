import "server-only";
import { z } from "zod";
import { cloudinaryImageSchema, cloudinaryImageUrl, productPublicId } from "@/lib/cloudinary/catalog-images";
import { CATALOG_MARKET } from "../config";
import { PRODUCT_CATEGORIES } from "../taxonomy";
import { normalizeBarcode } from "./barcode";
import { cleanCatalogText, isExcludedProduct, isMisleadingCatalogText } from "./product-safety";
import { permittedImageUrl } from "./normalize-product";
import { suggestDemoPrice } from "./demo-prices";

const text = (maximum: number) => z.string().trim().min(1).max(maximum)
	.refine((value) => cleanCatalogText(value) === value && !/[<>]/.test(value) && !isMisleadingCatalogText(value), "Use plain, reviewed text.");
const skuSchema = z.string().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const barcodeSchema = z.string().max(14).refine((value) => normalizeBarcode(value) === value, "Use a normalized, valid barcode.");
const demoPriceSchema = z.strictObject({
	currency: z.literal(CATALOG_MARKET.currency),
	priceMinor: z.int().min(1).max(50_000),
	basis: z.enum(["OBSERVED_MEDIAN", "OBSERVED_LIMITED", "MANUAL_DEMO"]),
	observationCount: z.int().min(1).max(10_000).nullable(),
	observedFrom: z.iso.date().nullable(),
	observedTo: z.iso.date().nullable(),
	approved: z.literal(true),
	approvedAt: z.iso.datetime({ offset: true }),
});

const evidenceSchema = z.strictObject({
	sourcePriceId: z.int().positive(), productCode: z.string().max(14).regex(/^\d{8,14}$/),
	priceMinor: z.int().min(1).max(50_000), currency: z.literal(CATALOG_MARKET.currency),
	observedOn: z.iso.date(), isDiscounted: z.boolean(), locationId: z.int().positive(),
	locationCountryCode: z.literal(CATALOG_MARKET.country),
});

const imageSchema = z.strictObject({
	path: z.string().max(200),
	sourceUrl: z.string().max(300).refine((value) => permittedImageUrl(value) !== null),
	productUrl: z.string().max(300).regex(/^https:\/\/world\.openfoodfacts\.org\/product\/\d{8,14}$/),
	license: z.literal("CC BY-SA 3.0"), attribution: z.literal("Open Food Facts contributors"),
	cloudinary: cloudinaryImageSchema.optional(),
});

export const curatedProductSchema = z.strictObject({
	sku: skuSchema, barcode: barcodeSchema.nullable(), displayName: text(60), brand: text(60).nullable(),
	category: z.enum(PRODUCT_CATEGORIES), variantGroup: skuSchema,
	netQuantity: z.int().min(1).max(1_000_000), netQuantityUnit: z.enum(["GRAM", "MILLILITER", "COUNT"]),
	sizeLabel: text(40), synonyms: z.array(text(60).refine((value) => value === value.toLowerCase(), "Store search synonyms in lowercase.")).max(20), image: imageSchema.nullable(),
	source: z.enum(["OPEN_PRICES", "CAREBASKET_CURATED"]), sourceProductId: z.int().positive().nullable(),
	sourceProductCode: z.string().max(14).regex(/^\d{8,14}$/).nullable(),
	sourceSystem: z.enum(["off", "obf", "opf", "opff"]).nullable(), sourceLicense: z.literal("ODbL 1.0"),
	isActive: z.boolean(), isChildSuitable: z.boolean(),
	demoPrice: demoPriceSchema, verification: z.array(evidenceSchema).max(1000),
}).superRefine((product, context) => {
	const issue = (message: string) => context.addIssue({ code: "custom", message });
	if (isExcludedProduct([product.displayName, product.brand, product.variantGroup, ...product.synonyms].join(" "))) issue("Product excluded by safety policy.");
	if (product.image && (product.image.path !== `/products/${product.sku}.${product.image.sourceUrl.split(".").pop()}` || product.sourceSystem !== "off" || product.image.productUrl !== `https://world.openfoodfacts.org/product/${product.sourceProductCode}`)) issue("Image path or provenance does not match this product.");
	if (product.image?.cloudinary) {
		const remote = product.image.cloudinary;
		try {
			if (remote.publicId !== productPublicId(product.sku, remote.sha256)
				|| remote.format !== product.image.path.split(".").pop()) issue("Cloudinary identity does not match this product photo.");
			cloudinaryImageUrl(remote);
		} catch { issue("Invalid Cloudinary photo identity or URL length."); }
	}
	const price = product.demoPrice;
	const approvedTime = new Date(price.approvedAt);
	const approvedDate = Number.isFinite(approvedTime.getTime()) ? approvedTime.toISOString().slice(0, 10) : "";
	if (product.source === "CAREBASKET_CURATED") {
		if (product.sourceProductId !== null || product.sourceProductCode !== null || product.sourceSystem !== null || product.verification.length || price.basis !== "MANUAL_DEMO" || price.observationCount !== null || price.observedFrom !== null || price.observedTo !== null || product.image) issue("Manual demo products must not claim external provenance.");
	} else {
		if (!product.barcode || !product.sourceProductId || !product.sourceProductCode || !product.sourceSystem || normalizeBarcode(product.sourceProductCode) !== product.barcode || product.verification.length === 0) issue("Open Prices products need matching source references and U.S. verification evidence.");
		if (product.verification.some((observation) => normalizeBarcode(observation.productCode) !== product.barcode || observation.observedOn > approvedDate)) issue("Observation does not belong to this product or is later than approval.");
		if (new Set(product.verification.map((observation) => observation.sourcePriceId)).size !== product.verification.length) issue("Duplicate observation IDs.");
		if (price.basis === "MANUAL_DEMO") {
			if (price.observationCount !== null || price.observedFrom !== null || price.observedTo !== null) issue("Manual price must not claim an observed derivation.");
		} else {
			const suggestion = suggestDemoPrice(product.verification, approvedDate);
			if (!suggestion || suggestion.basis !== price.basis || suggestion.observationCount !== price.observationCount || suggestion.observedFrom !== price.observedFrom || suggestion.observedTo !== price.observedTo || suggestion.priceMinor !== price.priceMinor) {
				issue("Observed demo-price basis must match the recent, non-discounted evidence. Use MANUAL_DEMO for a different approved price.");
			}
		}
	}
});

export const curatedCatalogSchema = z.strictObject({
	version: z.literal(1), country: z.literal(CATALOG_MARKET.country), currency: z.literal(CATALOG_MARKET.currency),
	locale: z.literal(CATALOG_MARKET.locale), merchant: z.literal(CATALOG_MARKET.merchantName),
	license: z.literal("ODbL 1.0"),
	attribution: z.literal("Open Food Facts and Open Prices contributors; CareBasket curated demo data"),
	products: z.array(curatedProductSchema).max(200),
}).superRefine((catalog, context) => {
	for (const key of ["sku", "barcode", "sourceProductId"] as const) {
		const values = catalog.products.map((product) => product[key]).filter((value) => value !== null);
		if (new Set(values).size !== values.length) context.addIssue({ code: "custom", path: ["products"], message: `Duplicate ${key}.` });
	}
});

export type CuratedCatalog = z.infer<typeof curatedCatalogSchema>;

export class CatalogValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CatalogValidationError";
	}
}

export function validateSeedCatalog(input: unknown, now = new Date()): CuratedCatalog {
	const result = curatedCatalogSchema.safeParse(input);
	if (!result.success) throw new CatalogValidationError("Catalog validation failed. Check approval, provenance, required fields, duplicates, and image licenses; no writes were made.");
	if (result.data.products.length === 0) throw new CatalogValidationError("Catalog is empty. Review and approve products before seeding; no writes were made.");
	if (result.data.products.some((product) => new Date(product.demoPrice.approvedAt) > now)) throw new CatalogValidationError("Catalog approval cannot be in the future; no writes were made.");
	return result.data;
}
