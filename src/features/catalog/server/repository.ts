import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db/client";
import { CATALOG_MARKET } from "../config";
import type { CatalogFilters } from "../types";

const productSelect = {
	id: true, sku: true, displayName: true, brand: true, category: true, sizeLabel: true,
	imagePath: true, source: true, imageAttribution: true, imageSourceUrl: true, imageProductUrl: true,
	demoPrices: {
		where: { currency: CATALOG_MARKET.currency }, take: 1,
		select: { priceMinor: true, currency: true },
	},
} satisfies Prisma.CatalogProductSelect;

export type CatalogRow = Prisma.CatalogProductGetPayload<{ select: typeof productSelect }>;

function availableWhere(childOnly: boolean): Prisma.CatalogProductWhereInput {
	return {
		isActive: true, archivedAt: null,
		...(childOnly ? { isChildSuitable: true } : {}),
		demoPrices: { some: { currency: CATALOG_MARKET.currency, priceMinor: { gt: 0, lte: 50_000 } } },
	};
}

export async function listCatalogRows(filters: CatalogFilters, childOnly: boolean): Promise<CatalogRow[]> {
	return getDb().catalogProduct.findMany({
		where: {
			...availableWhere(childOnly),
			...(filters.category ? { category: filters.category } : {}),
			...(filters.cursor ? { id: { gt: filters.cursor } } : {}),
			...(filters.q ? { OR: [
				{ displayName: { contains: filters.q, mode: "insensitive" } },
				{ synonyms: { has: filters.q.toLowerCase() } },
			] } : {}),
		},
		orderBy: { id: "asc" }, take: Math.min(filters.limit + 1, 50), select: productSelect,
	});
}

export async function findCatalogRow(sku: string, childOnly: boolean): Promise<CatalogRow | null> {
	return getDb().catalogProduct.findFirst({ where: { ...availableWhere(childOnly), sku }, select: productSelect });
}
