import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { CatalogFilters } from "../types";
import { findCatalogRow, listCatalogRows } from "./repository";

// Owner: catalog feature; lifetime: hours; invalidation: restart/redeploy after manual seed.
async function readSharedPage(filters: Omit<CatalogFilters, "q">, childOnly: boolean) {
	"use cache";
	cacheTag("catalog");
	cacheLife("hours");
	return listCatalogRows({ ...filters, q: "" }, childOnly);
}

export async function readCatalogPage(filters: CatalogFilters, childOnly: boolean) {
	const { q, ...publicFilters } = filters;
	// Free-text searches might contain something personal. Never put them in shared cache keys.
	if (q) return listCatalogRows(filters, childOnly);
	return readSharedPage(publicFilters, childOnly);
}

export async function readCatalogProduct(sku: string, childOnly: boolean) {
	"use cache";
	cacheTag("catalog");
	cacheLife("hours");
	return findCatalogRow(sku, childOnly);
}
