import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db/client";
import { CATALOG_MARKET } from "../config";
import type { CatalogFilters } from "../types";

function approvedPriceWhere(now: Date) {
	return { currency: CATALOG_MARKET.currency, priceMinor: { gt: 0, lte: 50_000 }, approvedAt: { lte: now } };
}

const productSelect = (now: Date) => ({
	id: true, sku: true, displayName: true, brand: true, category: true, sizeLabel: true,
	imagePath: true, source: true, imageAttribution: true, imageSourceUrl: true, imageProductUrl: true,
	demoPrices: {
		where: approvedPriceWhere(now), take: 1,
		select: { priceMinor: true, currency: true },
	},
} satisfies Prisma.CatalogProductSelect);

export type CatalogRow = Prisma.CatalogProductGetPayload<{ select: ReturnType<typeof productSelect> }>;

function availableWhere(childOnly: boolean, now: Date): Prisma.CatalogProductWhereInput {
	return {
		isActive: true, archivedAt: null,
		...(childOnly ? { isChildSuitable: true } : {}),
		demoPrices: { some: approvedPriceWhere(now) },
	};
}

export async function listCatalogRows(filters: CatalogFilters, childOnly: boolean): Promise<CatalogRow[]> {
	const now = new Date();
	return getDb().catalogProduct.findMany({
		where: {
			...availableWhere(childOnly, now),
			...(filters.category ? { category: filters.category } : {}),
			...(filters.cursor ? { id: { gt: filters.cursor } } : {}),
			...(filters.before ? { id: { lt: filters.before } } : {}),
			...(filters.q ? { OR: [
				{ displayName: { contains: filters.q, mode: "insensitive" } },
				{ synonyms: { has: filters.q.toLowerCase() } },
			] } : {}),
		},
		orderBy: { id: filters.before ? "desc" : "asc" }, take: Math.min(filters.limit + 1, 50), select: productSelect(now),
	});
}

export async function findCatalogRow(sku: string, childOnly: boolean): Promise<CatalogRow | null> {
	const now = new Date();
	return getDb().catalogProduct.findFirst({ where: { ...availableWhere(childOnly, now), sku }, select: productSelect(now) });
}
