import "server-only";
import { z } from "zod";
import type { DeviceActor } from "@/server/auth/device-policy";
import type { AdultActor } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import { catalogCopy } from "../copy";
import { catalogFiltersSchema } from "../schemas";
import type { CatalogPage, CatalogProductDto, ManagerProductDto } from "../types";
import { readCatalogPage, readCatalogProduct } from "./cached-catalog";
import type { CatalogRow } from "./repository";

function assertDevice(actor: DeviceActor) {
	if (actor.type !== "device" || !["ASSISTED_ADULT", "CHILD"].includes(actor.profileKind)) throw new AppError("FORBIDDEN");
}

function assertAdult(actor: AdultActor) {
	if (actor.type !== "adult" || !["OWNER", "MANAGER"].includes(actor.role)) throw new AppError("FORBIDDEN");
}

function requesterProduct(row: CatalogRow): CatalogProductDto {
	// Explicit projection prevents prices, IDs, provenance and family data reaching a device.
	return { sku: row.sku, displayName: row.displayName, category: row.category, sizeLabel: row.sizeLabel, imagePath: row.imagePath };
}

function managerProduct(row: CatalogRow): ManagerProductDto {
	const price = row.demoPrices[0];
	if (!price) throw new AppError("NOT_FOUND");
	return {
		...requesterProduct(row), brand: row.brand, demoPrice: price,
		attribution: row.source === "CAREBASKET_CURATED" ? catalogCopy.curatedSource : catalogCopy.source,
		imageAttribution: row.imageAttribution, imageSourceUrl: row.imageSourceUrl, imageProductUrl: row.imageProductUrl,
	};
}

function page<T>(rows: CatalogRow[], limit: number, project: (row: CatalogRow) => T): CatalogPage<T> {
	return {
		products: rows.slice(0, limit).map(project),
		nextCursor: rows.length > limit ? rows[limit - 1].id : null,
	};
}

export async function listRequesterProducts(actor: DeviceActor, input: unknown): Promise<CatalogPage<CatalogProductDto>> {
	assertDevice(actor);
	const filters = catalogFiltersSchema.parse(input);
	return page(await readCatalogPage(filters, actor.profileKind === "CHILD"), filters.limit, requesterProduct);
}

export async function listManagerProducts(actor: AdultActor, input: unknown): Promise<CatalogPage<ManagerProductDto>> {
	assertAdult(actor);
	const filters = catalogFiltersSchema.parse(input);
	return page(await readCatalogPage(filters, false), filters.limit, managerProduct);
}

export async function getRequesterProduct(actor: DeviceActor, sku: string): Promise<CatalogProductDto> {
	assertDevice(actor);
	const row = await readCatalogProduct(z.string().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).parse(sku), actor.profileKind === "CHILD");
	if (!row) throw new AppError("NOT_FOUND");
	return requesterProduct(row);
}

export async function getManagerProduct(actor: AdultActor, sku: string): Promise<ManagerProductDto> {
	assertAdult(actor);
	const row = await readCatalogProduct(z.string().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).parse(sku), false);
	if (!row) throw new AppError("NOT_FOUND");
	return managerProduct(row);
}
