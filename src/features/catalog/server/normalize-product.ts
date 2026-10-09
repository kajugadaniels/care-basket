import "server-only";
import type { OpenPricesProduct } from "@/lib/open-prices/types";
import type { FoodFactsMetadata } from "@/lib/open-food-facts/client";
import { CATEGORY_TAGS } from "../taxonomy";
import type { ProductCategory } from "../taxonomy";
import { normalizeBarcode } from "./barcode";
import { cleanCatalogText, isExcludedProduct, isMisleadingCatalogText } from "./product-safety";
import { normalizeQuantity } from "./quantity";

export function permittedImageUrl(value: string | null | undefined): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		if (url.protocol !== "https:" || url.hostname !== "images.openfoodfacts.org" || url.port || url.username || url.password || url.search || url.hash) return null;
		if (!/^\/images\/products\/[\d/]+\/[a-z0-9_.-]+\.400\.(jpg|png|webp)$/i.test(url.pathname)) return null;
		return url.href;
	} catch {
		return null;
	}
}

export function normalizeProduct(product: OpenPricesProduct, enrichment?: FoodFactsMetadata | null) {
	const barcode = normalizeBarcode(product.code);
	if (!barcode) return { ok: false as const, reason: "invalid-barcode" };
	if (!product.source || !["off", "obf", "opf", "opff"].includes(product.source)) return { ok: false as const, reason: "missing-source" };
	if (enrichment && normalizeBarcode(enrichment.code) !== barcode) return { ok: false as const, reason: "source-mismatch" };
	const rawName = product.product_name || enrichment?.product_name || "";
	const tags = product.categories_tags.length ? product.categories_tags : enrichment?.categories_tags ?? [];
	if (isExcludedProduct(`${rawName} ${tags.join(" ")}`)) return { ok: false as const, reason: "excluded-policy" };
	const displayName = cleanCatalogText(rawName);
	if (!displayName || displayName.length > 60 || isMisleadingCatalogText(displayName)) {
		return { ok: false as const, reason: "invalid-name" };
	}
	const category = (Object.keys(CATEGORY_TAGS) as ProductCategory[]).find((key) => CATEGORY_TAGS[key].some((tag) => tags.includes(tag)));
	if (!category) return { ok: false as const, reason: "unmapped-category" };
	const quantity = normalizeQuantity(product.product_quantity, product.product_quantity_unit, product.quantity)
		?? normalizeQuantity(enrichment?.product_quantity ? Number(enrichment.product_quantity) : null, enrichment?.product_quantity_unit, enrichment?.quantity);
	if (!quantity) return { ok: false as const, reason: "missing-quantity" };
	const slug = displayName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 38);
	if (!slug) return { ok: false as const, reason: "invalid-name" };
	const brand = cleanCatalogText((product.brands || enrichment?.brands || "").split(",")[0]);
	if (brand.length > 60) return { ok: false as const, reason: "invalid-brand" };
	return {
		ok: true as const,
		product: {
			sku: `${slug}-op-${product.id}`, barcode, displayName, brand: brand || null, category,
			variantGroup: "", synonyms: [] as string[], ...quantity,
			source: "OPEN_PRICES" as const, sourceProductId: product.id, sourceProductCode: product.code,
			sourceSystem: product.source, sourceLicense: "ODbL 1.0" as const,
			imageCandidateUrl: product.source === "off" ? permittedImageUrl(enrichment?.image_front_url || product.image_url) : null,
			imageProductUrl: product.source === "off" ? `https://world.openfoodfacts.org/product/${product.code}` : null,
			isActive: true, isChildSuitable: false,
		},
	};
}
