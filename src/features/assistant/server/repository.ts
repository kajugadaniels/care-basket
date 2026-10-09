import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { DeviceActor } from "@/server/auth/device-policy";
import type { AdultActor } from "@/server/auth/require-adult";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { catalogContextSchema } from "@/lib/ai/catalog-context";
import type { AssistantProduct } from "../types";
import { contextCategories } from "./context-categories";

export const AI_CONSENT_VERSION = "ai-shopping-v1";
export function readAssistantProfile(actor: DeviceActor) {
	return getDb().managedProfile.findFirst({ where: { id: actor.profileId, familyId: actor.familyId, kind: actor.profileKind },
		select: { kind: true, aiAssistEnabled: true, aiConsentConfirmedAt: true, aiConsentVersion: true } });
}
export async function readAssistantCatalog(child: boolean, filter: { text?: string; skus?: string[] } = {}): Promise<AssistantProduct[]> {
	const query = {
		where: { isActive: true, archivedAt: null, ...(child ? { isChildSuitable: true } : {}),
			...(filter.skus ? { sku: { in: filter.skus } } : {}),
			demoPrices: { some: { currency: "USD", approvedAt: { lte: new Date() }, priceMinor: { gt: 0, lte: 50_000 } } } },
		orderBy: { id: "asc" }, take: 201,
		select: { sku: true, displayName: true, category: true, sizeLabel: true, imagePath: true,
			variantGroup: true, synonyms: true, netQuantity: true, netQuantityUnit: true,
			demoPrices: { where: { currency: "USD", approvedAt: { lte: new Date() }, priceMinor: { gt: 0, lte: 50_000 } },
				take: 1, select: { priceMinor: true } } },
	} as const;
	let rows = await getDb().catalogProduct.findMany(query);
	if (rows.length > 200) {
		const categories = contextCategories(filter.text ?? "");
		if (!categories.length) throw new AppError("AI_UNAVAILABLE");
		rows = await getDb().catalogProduct.findMany({ ...query, where: { ...query.where, category: { in: categories } } });
		// Never silently truncate a category or send an unbounded context.
		if (rows.length > 200) throw new AppError("AI_UNAVAILABLE");
	}
	return rows.flatMap(({ demoPrices, ...product }) => {
		const safe = catalogContextSchema.safeParse({ sku: product.sku, name: product.displayName,
			category: product.category, sizeLabel: product.sizeLabel, variantGroup: product.variantGroup, synonyms: product.synonyms });
		return safe.success && demoPrices[0] && Number.isInteger(demoPrices[0].priceMinor)
			&& Number.isFinite(product.netQuantity) && product.netQuantity > 0
			? [{ ...product, priceMinor: demoPrices[0].priceMinor }] : [];
	});
}
export async function readProviderContext(categories: ReturnType<typeof contextCategories>) {
	"use cache";
	cacheLife({ stale: 60, revalidate: 300, expire: 600 });
	cacheTag("catalog:assistant-context");
	const rows = await getDb().catalogProduct.findMany({
		where: { isActive: true, archivedAt: null, ...(categories.length ? { category: { in: categories } } : {}) },
		orderBy: { id: "asc" }, take: 201,
		select: { sku: true, displayName: true, category: true, sizeLabel: true, variantGroup: true, synonyms: true },
	});
	if (rows.length > 200) throw new AppError("AI_UNAVAILABLE");
	return rows.flatMap((product) => {
		// Explicit projection prevents unexpected database fields from reaching the provider.
		const context = catalogContextSchema.safeParse({ sku: product.sku, name: product.displayName,
			category: product.category, sizeLabel: product.sizeLabel, variantGroup: product.variantGroup, synonyms: product.synonyms });
		return context.success ? [context.data] : [];
	});
}
export function readAiPreference(actor: AdultActor, profileId: string) {
	return getDb().managedProfile.findFirst({ where: { id: profileId, familyId: actor.familyId },
		select: { kind: true, aiAssistEnabled: true } });
}
export function writeAiPreference(actor: AdultActor, profileId: string, enabled: boolean) {
	return getDb().$transaction(async (tx) => {
		const updated = await tx.managedProfile.updateMany({ where: { id: profileId, familyId: actor.familyId,
			...(enabled ? { kind: "ASSISTED_ADULT" } : {}) }, data: { aiAssistEnabled: enabled,
			aiConsentConfirmedAt: enabled ? new Date() : null, aiConsentVersion: enabled ? AI_CONSENT_VERSION : null } });
		if (updated.count !== 1) throw new AppError("NOT_FOUND");
		await tx.auditLog.create({ data: { familyId: actor.familyId, actorType: "ADULT", actorId: actor.userId,
			action: enabled ? "profile.ai_consent_granted" : "profile.ai_consent_revoked", targetType: "ManagedProfile", targetId: profileId } });
	});
}
