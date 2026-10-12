import "server-only";
import { z } from "zod";
import { isAdultProfile } from "@/lib/audience";
import type { DeviceActor } from "@/server/auth/device-policy";
import { AppError } from "@/server/errors";
import { catalogFiltersSchema } from "../schemas";
import type { CatalogFilters, CatalogPage, CatalogProductDto } from "../types";
import { readCatalogPage, readCatalogProduct } from "./cached-catalog";
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
	const row = await readCatalogProduct(z.string().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).parse(sku), false);
	if (!row) throw new AppError("NOT_FOUND");
	return requesterProduct(row);
}
