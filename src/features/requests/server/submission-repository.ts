import "server-only";
import { getDb } from "@/server/db/client";
import { isUniqueConstraintViolation } from "@/server/db/errors";
import { DEVICE_IDLE_MS, type DeviceActor } from "@/server/auth/device-policy";
import { writeRequestEvent } from "@/server/audit/write-request-event";
import { AppError } from "@/server/errors";
import { verifyShoppingProposal } from "@/server/auth/shopping-proposal";
import type { SubmitRequestInput } from "../schemas";
import { basketSubtotal, databaseConflict, submissionFingerprint } from "./basket-policy";

export async function insertRequest(actor: DeviceActor, input: SubmitRequestInput) {
	const db = getDb();
	const submissionHash = submissionFingerprint(input);
	const where = { familyId: actor.familyId, profileId: actor.profileId, clientRequestKey: input.clientRequestKey };
	const select = { id: true, submissionHash: true } as const;
	const existing = await db.shoppingRequest.findFirst({ where, select });
	if (existing) {
		if (existing.submissionHash !== submissionHash) throw new AppError("CONFLICT");
		return { requestId: existing.id };
	}
	if (actor.profileKind === "CHILD" && (input.inputMode === "VOICE" || input.budgetMinor !== undefined
		|| input.items.some((item) => item.origin === "SUGGESTED" || item.isSubstitute))) throw new AppError("FORBIDDEN");
	if (input.inputMode === "VOICE") {
		if (!input.sourceProof) throw new AppError("VALIDATION_FAILED");
		const claim = verifyShoppingProposal(actor, input.sourceProof);
		if (claim.inputMode !== "VOICE" || claim.inputText !== input.inputText) throw new AppError("VALIDATION_FAILED");
	}
	if (input.items.filter((item) => item.origin === "SUGGESTED").length > 12) throw new AppError("VALIDATION_FAILED");
	for (const item of input.items) {
		if (item.origin !== "SUGGESTED" && !item.isSubstitute && !item.substitutionNote) continue;
		if (!item.proof) throw new AppError("VALIDATION_FAILED");
		const claim = verifyShoppingProposal(actor, item.proof);
		if (!claim.items.some((entry) => entry.sku === item.sku && entry.origin === (item.origin ?? "REQUESTED")
			&& entry.isSubstitute === (item.isSubstitute ?? false) && entry.substitutionNote === (item.substitutionNote ?? null))) throw new AppError("VALIDATION_FAILED");
		if (item.origin === "SUGGESTED" && item.quantity > 6) throw new AppError("VALIDATION_FAILED");
	}
	try {
		return await db.$transaction(async (tx) => {
			const now = new Date();
			const device = await tx.authorizedDevice.findFirst({
				where: { id: actor.deviceId, familyId: actor.familyId, profileId: actor.profileId,
					revokedAt: null, expiresAt: { gt: now }, lastSeenAt: { gt: new Date(now.getTime() - DEVICE_IDLE_MS) },
					profile: { kind: actor.profileKind } }, select: { id: true },
			});
			if (!device) throw new AppError("UNAUTHENTICATED");
			const products = await tx.catalogProduct.findMany({
				where: { sku: { in: input.items.map((item) => item.sku) }, isActive: true, archivedAt: null,
					...(actor.profileKind === "CHILD" ? { isChildSuitable: true } : {}) },
				select: { id: true, sku: true, demoPrices: {
					where: { currency: "USD", approvedAt: { lte: now }, priceMinor: { gt: 0 } },
					select: { priceMinor: true, currency: true, approvedAt: true },
				} },
			});
			if (products.length !== input.items.length) throw new AppError("VALIDATION_FAILED");
			const bySku = new Map(products.map((product) => [product.sku, product]));
			const items = input.items.map((item) => {
				const product = bySku.get(item.sku);
				const price = product?.demoPrices[0];
				if (!product || !price || price.currency !== "USD" || !Number.isInteger(price.priceMinor)
					|| price.priceMinor <= 0 || price.approvedAt > now) throw new AppError("VALIDATION_FAILED");
				return { productId: product.id, quantity: item.quantity, unitPriceMinor: price.priceMinor,
					origin: item.origin ?? "REQUESTED", isSubstitute: item.isSubstitute ?? false,
					...(item.substitutionNote ? { substitutionNote: item.substitutionNote } : {}) };
			});
			const subtotalMinor = basketSubtotal(items);
			const request = await tx.shoppingRequest.create({
				data: { familyId: actor.familyId, profileId: actor.profileId, deviceId: actor.deviceId,
					clientRequestKey: input.clientRequestKey, submissionHash, inputMode: input.inputMode,
					...(input.inputText ? { inputText: input.inputText } : {}),
					...(input.budgetMinor !== undefined ? { budgetMinor: input.budgetMinor } : {}),
					status: "PENDING_REVIEW", fulfillmentStatus: "NOT_STARTED", submittedAt: now }, select: { id: true },
			});
			// Explicit creation keeps both composite request/family FK scalars server-owned.
			await tx.shoppingBasket.create({
				data: { requestId: request.id, familyId: actor.familyId, currency: "USD", subtotalMinor,
					items: { create: items } }, select: { id: true },
			});
			await writeRequestEvent(tx, actor, request.id, "request.submitted");
			return { requestId: request.id };
		}, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 15_000 });
	} catch (error) {
		if (!isUniqueConstraintViolation(error) && !databaseConflict(error)) throw error;
		// Read outside the failed transaction, including simultaneous submissions.
		const winner = await db.shoppingRequest.findFirst({ where, select });
		if (winner?.submissionHash === submissionHash) return { requestId: winner.id };
		throw new AppError("CONFLICT");
	}
}
