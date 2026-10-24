import "server-only";
import { isAdultProfile } from "@/lib/audience";
import type { DeviceActor } from "@/server/auth/device-policy";
import { AppError } from "@/server/errors";
import { catalogFiltersSchema, catalogSkusSchema, catalogSkuSchema } from "../schemas";
import type { CatalogFilters, CatalogPage, CatalogProductDto } from "../types";
import { readCatalogPage, readCatalogProduct, readCatalogProducts } from "./cached-catalog";
import type { CatalogRow } from "./repository";

function assertDevice(actor: DeviceActor) {
	if (actor.type !== "device" || !isAdultProfile(actor.profileKind)) throw new AppError("FORBIDDEN");
}

function requesterProduct(row: CatalogRow): CatalogProductDto {
	// Explicit projection prevents prices, IDs, provenance and family data reaching a device.
	return { sku: row.sku, displayName: row.displayName, category: row.category, sizeLabel: row.sizeLabel, imagePath: row.imagePath };
}

function page<T>(rows: CatalogRow[], filters: CatalogFilters, project: (row: CatalogRow) => T): CatalogPage<T> {
	const visible = rows.slice(0, filters.limit);
	const hasMore = rows.length > filters.limit;
	// Backward queries read the nearest preceding rows, then restore display order.
	if (filters.before) visible.reverse();
	const first = visible[0]?.id ?? null;
	const last = visible.at(-1)?.id ?? null;
	let nextCursor = hasMore ? last : null;
	let previousCursor = filters.cursor ? first ?? filters.cursor : null;
	if (filters.before) {
		nextCursor = last ?? filters.before;
		previousCursor = hasMore ? first : null;
	}
	return {
		products: visible.map(project),
		nextCursor,
		previousCursor,
	};
}

export async function listRequesterProducts(actor: DeviceActor, input: unknown): Promise<CatalogPage<CatalogProductDto>> {
	assertDevice(actor);
	const filters = catalogFiltersSchema.parse(input);
	return page(await readCatalogPage(filters, false), filters, requesterProduct);
}

export async function getRequesterProduct(actor: DeviceActor, sku: string): Promise<CatalogProductDto> {
	assertDevice(actor);
	const row = await readCatalogProduct(catalogSkuSchema.parse(sku), false);
	if (!row) throw new AppError("NOT_FOUND");
	return requesterProduct(row);
}

export async function getRequesterProducts(actor: DeviceActor, input: unknown): Promise<CatalogProductDto[]> {
	assertDevice(actor);
	const skus = catalogSkusSchema.parse(input);
	const rows = await readCatalogProducts([...skus].sort(), false);
	const products = new Map(rows.map((row) => [row.sku, requesterProduct(row)]));

	return skus.flatMap((sku) => {
		const product = products.get(sku);
		return product ? [product] : [];
	});
}
