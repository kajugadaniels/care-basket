import "server-only";
import type { VerifiedPayment } from "@/lib/paypal/capture";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { finishEvent, type VerifiedEventInput } from "./payment-events";
import { paymentSelect, TRANSACTION_OPTIONS, type PaymentAttempt } from "./persistence";

type Actor = { type: "adult"; userId: string } | { type: "system" };

export async function commitVerifiedPayment(payment: PaymentAttempt, verified: VerifiedPayment,
	event: VerifiedEventInput, actor: Actor, token?: string) {
	return getDb().$transaction(async (tx) => {
		// Same row mutex used by edits/create/cancel, equivalent to serial execution per request.
		const locked = await tx.shoppingRequest.updateMany({ where: { id: payment.requestId, familyId: payment.familyId },
			data: { revision: { increment: 0 } } });
		if (locked.count !== 1) throw new AppError("NOT_FOUND");
		const current = await tx.payment.findFirst({ where: { id: payment.id, familyId: payment.familyId,
			requestId: payment.requestId, paypalOrderId: payment.paypalOrderId }, select: paymentSelect });
		if (!current || (current.paypalCaptureId && current.paypalCaptureId !== verified.captureId)) throw new AppError("CONFLICT");
		if (event.paypalEventId) {
			const saved = await tx.paymentEvent.findUnique({ where: { paypalEventId: event.paypalEventId }, select: { processedAt: true } });
			if (saved?.processedAt) return current;
		}
		// Webhooks invalidate any outstanding worker; a late response cannot overwrite the winner.
		if (token && (current.operationToken !== token || !current.operationExpiresAt || current.operationExpiresAt <= new Date())) {
			if (["CAPTURED", "REFUNDED", "REVERSED"].includes(current.status)) return current;
			throw new AppError("CONFLICT");
		}
		const terminal = ["REVERSED", "DENIED", "VOIDED"].includes(current.status)
			|| current.status === "REFUNDED" && verified.status !== "REVERSED";
		const regression = current.status === "CAPTURED" && ["CREATED", "APPROVED", "PENDING", "DENIED"].includes(verified.status)
			|| current.status === "PENDING" && ["CREATED", "APPROVED"].includes(verified.status)
			|| current.status === "APPROVED" && verified.status === "CREATED";
		const same = current.status === verified.status && current.paypalCaptureId === verified.captureId;
		if (terminal || regression || same) {
			if (token) await tx.payment.updateMany({ where: { id: current.id, familyId: current.familyId, operationToken: token },
				data: { operationToken: null, operationExpiresAt: null } });
			if (event.paypalEventId) await finishEvent(tx, event, current.id, "NO_CHANGE");
			return current;
		}
		const request = await tx.shoppingRequest.findFirst({ where: { id: current.requestId, familyId: current.familyId },
			select: { status: true, basket: { select: { id: true, lockedAt: true, currency: true, subtotalMinor: true } } } });
		if (!request?.basket?.lockedAt || request.basket.id !== current.basketId || request.basket.currency !== current.currency
			|| request.basket.subtotalMinor !== current.amountMinor || !["AWAITING_PAYMENT", "PAID"].includes(request.status)) {
			throw new AppError("CONFLICT");
		}
		const capturedAt = current.capturedAt ?? verified.capturedAt;
		const updated = await tx.payment.updateMany({ where: { id: current.id, requestId: current.requestId, familyId: current.familyId,
			status: current.status, ...(token ? { operationToken: token } : {}) }, data: {
			status: verified.status, paypalCaptureId: verified.captureId, capturedAt,
			operationToken: null, operationExpiresAt: null,
		} });
		if (updated.count !== 1) throw new AppError("CONFLICT");
		if (verified.status === "CAPTURED" && request.status === "AWAITING_PAYMENT") {
			const paid = await tx.shoppingRequest.updateMany({ where: { id: current.requestId, familyId: current.familyId,
				status: "AWAITING_PAYMENT" }, data: { status: "PAID", revision: { increment: 1 } } });
			if (paid.count !== 1) throw new AppError("CONFLICT");
		}
		if (verified.status === "DENIED") {
			const returned = await tx.shoppingRequest.updateMany({ where: { id: current.requestId, familyId: current.familyId,
				status: "AWAITING_PAYMENT" }, data: { status: "PENDING_REVIEW", revision: { increment: 1 } } });
			const unlocked = await tx.shoppingBasket.updateMany({ where: { id: current.basketId, familyId: current.familyId,
				requestId: current.requestId, lockedAt: { not: null } }, data: { lockedAt: null } });
			if (returned.count !== 1 || unlocked.count !== 1) throw new AppError("CONFLICT");
		}
		await finishEvent(tx, event, current.id, verified.status, current.amountMinor, current.currency);
		await tx.auditLog.create({ data: { familyId: current.familyId, actorType: actor.type === "adult" ? "ADULT" : "SYSTEM",
			actorId: actor.type === "adult" ? actor.userId : current.id, action: `payment.${verified.status.toLowerCase()}`,
			targetType: "Payment", targetId: current.id }, select: { id: true } });
		return { ...current, status: verified.status, paypalCaptureId: verified.captureId, capturedAt,
			operationToken: null, operationExpiresAt: null };
	}, TRANSACTION_OPTIONS);
}
