import type { CatalogFilters } from "../../types";

export function catalogHref(base: string, filters: Partial<CatalogFilters>): string {
	const query = new URLSearchParams();
	if (filters.category) query.set("category", filters.category);
	if (filters.q) query.set("q", filters.q);
	if (filters.cursor) query.set("cursor", filters.cursor);
	else if (filters.before) query.set("before", filters.before);
	return query.size ? `${base}?${query}` : base;
}
