import "server-only";
import type { AdultActor } from "@/server/auth/require-adult";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import type { StartCheckoutInput } from "../schemas";
import { auditCheckout, conflictOnRace, lockRequest, OPEN_PAYMENT_STATUSES, paymentSelect, TRANSACTION_OPTIONS } from "./persistence";
import { priceBasket } from "./pricing";

export async function readOpenPayment(actor: AdultActor, requestId: string) {
	return getDb().payment.findFirst({ where: { familyId: actor.familyId, requestId,
		status: { in: [...OPEN_PAYMENT_STATUSES] }, request: { status: "AWAITING_PAYMENT" } }, select: paymentSelect });
}

export async function reserveCheckout(actor: AdultActor, input: StartCheckoutInput, paypalClientId: string) {
	try {
		return await getDb().$transaction(async (tx) => {
			await lockRequest(tx, actor, input.requestId);
			const now = new Date();
			const request = await tx.shoppingRequest.findFirst({
				where: { id: input.requestId, familyId: actor.familyId },
				select: { id: true, status: true, revision: true, basket: { select: {
					id: true, currency: true, subtotalMinor: true, lockedAt: true,
					payments: { where: { status: { in: [...OPEN_PAYMENT_STATUSES] } }, take: 1, select: paymentSelect },
					items: { orderBy: { id: "asc" }, take: 31, select: {
						id: true, quantity: true, unitPriceMinor: true, product: { select: {
							sku: true, displayName: true, sizeLabel: true, isActive: true, archivedAt: true,
							demoPrices: { where: { currency: "USD" }, take: 2,
								select: { currency: true, priceMinor: true, approvedAt: true } },
						} },
					} },
				} } },
			});
			if (!request?.basket) throw new AppError("NOT_FOUND");
			const basket = request.basket;
			const existing = basket.payments[0];
			if (request.status === "AWAITING_PAYMENT" && basket.lockedAt && existing) {
				// Replaying the original start revision is safe only for this already-locked attempt.
				if (existing.status !== "CREATED") throw new AppError("CONFLICT");
				return { kind: "attempt" as const, payment: existing };
			}
			if (request.status !== "PENDING_REVIEW" || basket.lockedAt || existing || request.revision !== input.revision) {
				throw new AppError("CONFLICT");
			}
			const pricing = priceBasket(basket, now);
			if (pricing.changed) {
				for (const [index, item] of basket.items.entries()) {
					if (item.unitPriceMinor === pricing.items[index].unitPriceMinor) continue;
					await tx.basketItem.update({ where: { id: item.id, basketId: basket.id,
						basket: { familyId: actor.familyId, requestId: request.id } },
						data: { unitPriceMinor: pricing.items[index].unitPriceMinor } });
				}
				await tx.shoppingBasket.update({ where: { id: basket.id, familyId: actor.familyId, lockedAt: null },
					data: { subtotalMinor: pricing.amountMinor } });
				await tx.shoppingRequest.update({ where: { id: request.id, familyId: actor.familyId, revision: input.revision },
					data: { revision: { increment: 1 } } });
				await auditCheckout(tx, actor, request.id, "checkout.price_conflict");
				// Return, don't throw: commit refreshed snapshots before reporting CONFLICT.
				return { kind: "repriced" as const };
			}
			const locked = await tx.shoppingBasket.updateMany({
				where: { id: basket.id, requestId: request.id, familyId: actor.familyId, lockedAt: null }, data: { lockedAt: now },
			});
			if (locked.count !== 1) throw new AppError("CONFLICT");
			await tx.shoppingRequest.update({ where: { id: request.id, familyId: actor.familyId, revision: input.revision, status: "PENDING_REVIEW" },
				data: { status: "AWAITING_PAYMENT", revision: { increment: 1 }, reviewedByUserId: actor.userId, reviewedAt: now } });
			const payment = await tx.payment.create({ data: {
				familyId: actor.familyId, requestId: request.id, basketId: basket.id, initiatedByUserId: actor.userId,
				status: "CREATED", amountMinor: pricing.amountMinor, currency: "USD", orderItems: pricing.items, paypalClientId,
			}, select: paymentSelect });
			await auditCheckout(tx, actor, request.id, "checkout.started");
			return { kind: "attempt" as const, payment };
		}, TRANSACTION_OPTIONS);
	} catch (error) { return conflictOnRace(error); }
}
