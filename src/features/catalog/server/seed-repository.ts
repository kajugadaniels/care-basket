import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db/client";
import type { CuratedCatalog } from "./curated-schema";

function unchanged(existing: Record<string, unknown> | null, data: Record<string, unknown>): boolean {
	return existing !== null && Object.entries(data).every(([key, value]) => {
		const previous = existing[key];
		if (value instanceof Date) return previous instanceof Date && previous.getTime() === value.getTime();
		return JSON.stringify(previous) === JSON.stringify(value);
	});
}

// The whole file is validated by the seed service before the first transaction.
export async function upsertCuratedProducts(catalog: CuratedCatalog) {
	const db = getDb();
	for (const entry of catalog.products) {
		const { image, demoPrice, verification, ...fields } = entry;
		void verification; // Evidence stays in the published dataset, not a hypothetical observation table.
		const productData = {
			...fields, imagePath: image?.path ?? null, imageSourceUrl: image?.sourceUrl ?? null,
			imageProductUrl: image?.productUrl ?? null, imageLicense: image?.license ?? null,
			imageAttribution: image?.attribution ?? null,
		} satisfies Prisma.CatalogProductCreateInput;
		const priceData = {
			currency: demoPrice.currency, priceMinor: demoPrice.priceMinor, basis: demoPrice.basis,
			observationCount: demoPrice.observationCount, approvedAt: new Date(demoPrice.approvedAt),
			observedFrom: demoPrice.observedFrom ? new Date(`${demoPrice.observedFrom}T00:00:00Z`) : null,
			observedTo: demoPrice.observedTo ? new Date(`${demoPrice.observedTo}T00:00:00Z`) : null,
		};
		await db.$transaction(async (tx) => {
			const existing = await tx.catalogProduct.findUnique({
				where: { sku: entry.sku },
				select: {
					sku: true, barcode: true, displayName: true, brand: true, category: true, variantGroup: true,
					netQuantity: true, netQuantityUnit: true, sizeLabel: true, synonyms: true,
					imagePath: true, imageSourceUrl: true, imageProductUrl: true, imageLicense: true, imageAttribution: true,
					source: true, sourceProductId: true, sourceProductCode: true, sourceSystem: true, sourceLicense: true,
					isActive: true, isChildSuitable: true,
				},
			});
			const product = await tx.catalogProduct.upsert({
				where: { sku: entry.sku }, create: productData,
				update: unchanged(existing, productData) ? {} : productData,
				select: { id: true },
			});
			const key = { productId: product.id, currency: demoPrice.currency };
			const existingPrice = await tx.demoMerchantPrice.findUnique({
				where: { productId_currency: key },
				select: { currency: true, priceMinor: true, basis: true, observationCount: true, approvedAt: true, observedFrom: true, observedTo: true },
			});
			await tx.demoMerchantPrice.upsert({
				where: { productId_currency: key }, create: { productId: product.id, ...priceData },
				update: unchanged(existingPrice, priceData) ? {} : priceData,
				select: { id: true },
			});
		});
	}
	return { products: catalog.products.length };
}

export async function closeSeedConnection() {
	await getDb().$disconnect();
}
