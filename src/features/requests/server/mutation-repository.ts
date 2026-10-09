import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AdultActor } from "@/server/auth/require-adult";
import type { DeviceActor } from "@/server/auth/device-policy";
import { getDb } from "@/server/db/client";
import { writeRequestEvent } from "@/server/audit/write-request-event";
import { AppError } from "@/server/errors";
import type { CloseRequestInput, RemoveRequestItemInput, UpdateRequestItemInput } from "../schemas";
import { basketSubtotal, databaseConflict } from "./basket-policy";

type Actor = AdultActor | DeviceActor;
function ownedRequest(actor: Actor, requestId: string) {
	return { id: requestId, familyId: actor.familyId,
		...(actor.type === "device" ? { profileId: actor.profileId } : {}) };
}

async function acquireRevision(tx: Prisma.TransactionClient, actor: Actor, requestId: string, revision: number,
	data: { status?: "DECLINED" | "CANCELLED"; reviewedByUserId?: string; reviewedAt?: Date } = {}) {
	const updated = await tx.shoppingRequest.updateMany({
		where: { ...ownedRequest(actor, requestId), revision, status: "PENDING_REVIEW", basket: { lockedAt: null } },
		data: { ...data, revision: { increment: 1 } },
	});
	if (updated.count !== 1) throw new AppError("CONFLICT");
}

export async function editRequestItem(actor: AdultActor, input: UpdateRequestItemInput | RemoveRequestItemInput) {
	try {
		return await getDb().$transaction(async (tx) => {
			const request = await tx.shoppingRequest.findFirst({
				where: ownedRequest(actor, input.requestId), select: { id: true },
			});
			if (!request) throw new AppError("NOT_FOUND");
			// Conditional update obtains the request row lock before reading basket contents.
			// A simultaneous edit/cancel/decline cannot mutate using the old revision.
			await acquireRevision(tx, actor, input.requestId, input.revision);
			const basket = await tx.shoppingBasket.findFirst({
				where: { requestId: input.requestId, familyId: actor.familyId },
				select: { id: true, items: { select: { id: true, quantity: true, unitPriceMinor: true } } },
			});
			if (!basket) throw new AppError("CONFLICT");
			const item = basket.items.find((entry) => entry.id === input.itemId);
			if (!item) throw new AppError("NOT_FOUND");
			const changingQuantity = "quantity" in input;
			const items = changingQuantity
				? basket.items.map((entry) => entry.id === item.id ? { ...entry, quantity: input.quantity } : entry)
				: basket.items.filter((entry) => entry.id !== item.id);
			const subtotalMinor = basketSubtotal(items); // Reject removing the last item.
			const itemWhere = { id: item.id, basketId: basket.id, basket: { familyId: actor.familyId, requestId: input.requestId } };
			const result = changingQuantity
				? await tx.basketItem.updateMany({ where: itemWhere, data: { quantity: input.quantity } })
				: await tx.basketItem.deleteMany({ where: itemWhere });
			if (result.count !== 1) throw new AppError("CONFLICT");
			const totalUpdate = await tx.shoppingBasket.updateMany({
				where: { id: basket.id, familyId: actor.familyId, requestId: input.requestId, lockedAt: null }, data: { subtotalMinor },
			});
			if (totalUpdate.count !== 1) throw new AppError("CONFLICT");
			await writeRequestEvent(tx, actor, input.requestId, changingQuantity ? "basket.item_updated" : "basket.item_removed");
			return { requestId: input.requestId };
		}, { maxWait: 5_000, timeout: 15_000 });
	} catch (error) {
		if (databaseConflict(error)) throw new AppError("CONFLICT");
		throw error;
	}
}

export async function closeRequest(actor: Actor, input: CloseRequestInput) {
	const status = actor.type === "adult" ? "DECLINED" : "CANCELLED";
	try {
		return await getDb().$transaction(async (tx) => {
			const request = await tx.shoppingRequest.findFirst({
				where: ownedRequest(actor, input.requestId), select: { id: true, status: true },
			});
			if (!request) throw new AppError("NOT_FOUND");
			if (request.status === status) return { requestId: request.id };
			await acquireRevision(tx, actor, input.requestId, input.revision, {
				status, ...(actor.type === "adult" ? { reviewedByUserId: actor.userId, reviewedAt: new Date() } : {}),
			});
			await writeRequestEvent(tx, actor, input.requestId, actor.type === "adult" ? "request.declined" : "request.cancelled");
			return { requestId: input.requestId };
		}, { maxWait: 5_000, timeout: 15_000 });
	} catch (error) {
		if (databaseConflict(error)) throw new AppError("CONFLICT");
		throw error;
	}
}
