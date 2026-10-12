import "server-only";
import { randomUUID } from "node:crypto";
import type { AdultActor } from "@/server/auth/require-adult";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { CheckoutFailure } from "./failure";
import { auditCheckout, conflictOnRace, lockRequest, paymentSelect, TRANSACTION_OPTIONS } from "./persistence";

const OPERATION_LEASE_MS = 90_000;
// Orders create idempotency is retained for six hours by default. Stop replaying
// after five: an unresolved older attempt needs provider/operator reconciliation,
// never a fresh create key or an automatic unlock based only on elapsed time.
const CREATE_REPLAY_WINDOW_MS = 5 * 60 * 60_000;

export async function claimAttempt(actor: AdultActor, requestId: string, paymentId: string,
	mode: "CREATE" | "CANCEL", revision?: number) {
	return getDb().$transaction(async (tx) => {
		await lockRequest(tx, actor, requestId);
		const request = await tx.shoppingRequest.findFirst({ where: { id: requestId, familyId: actor.familyId },
			select: { status: true, revision: true, basket: { select: { lockedAt: true } } } });
		const payment = await tx.payment.findFirst({ where: { id: paymentId, requestId, familyId: actor.familyId }, select: paymentSelect });
		if (!payment) throw new AppError("NOT_FOUND");
		if (payment.status !== "CREATED" || payment.captureStartedAt || request?.status !== "AWAITING_PAYMENT" || !request.basket?.lockedAt
			|| (revision !== undefined && request.revision !== revision)) throw new AppError("CONFLICT");
		const now = new Date();
		if (payment.operationExpiresAt && payment.operationExpiresAt > now) throw new CheckoutFailure("IN_PROGRESS");
		if (!payment.paypalOrderId && payment.creationStartedAt
			&& now.getTime() - payment.creationStartedAt.getTime() >= CREATE_REPLAY_WINDOW_MS) throw new CheckoutFailure("RECONCILIATION");
		const token = randomUUID();
		const isFirstCreation = payment.creationStartedAt === null;
		const creationStartedAt = !payment.paypalOrderId && mode === "CREATE" && isFirstCreation ? now : payment.creationStartedAt;
		const updated = await tx.payment.updateMany({ where: { id: paymentId, requestId, familyId: actor.familyId,
			status: "CREATED", OR: [{ operationExpiresAt: null }, { operationExpiresAt: { lte: now } }] },
			data: { operationToken: token, operationExpiresAt: new Date(now.getTime() + OPERATION_LEASE_MS), creationStartedAt } });
		if (updated.count !== 1) throw new CheckoutFailure("IN_PROGRESS");
		return { payment: { ...payment, creationStartedAt }, token, isFirstCreation };
	}, TRANSACTION_OPTIONS);
}

function activeAttempt(actor: AdultActor, requestId: string, paymentId: string, token: string) {
	return { id: paymentId, requestId, familyId: actor.familyId, status: "CREATED" as const,
		operationToken: token, operationExpiresAt: { gt: new Date() }, captureStartedAt: null,
		request: { status: "AWAITING_PAYMENT" as const, basket: { lockedAt: { not: null } } } };
}

export async function savePreparedOrder(actor: AdultActor, requestId: string, paymentId: string, token: string, orderId: string) {
	try {
		return await getDb().$transaction(async (tx) => {
			await lockRequest(tx, actor, requestId);
			const saved = await tx.payment.updateMany({ where: { ...activeAttempt(actor, requestId, paymentId, token),
				OR: [{ paypalOrderId: null }, { paypalOrderId: orderId }] },
				data: { paypalOrderId: orderId, operationToken: null, operationExpiresAt: null } });
			if (saved.count !== 1) throw new AppError("CONFLICT");
			await auditCheckout(tx, actor, requestId, "checkout.order_created");
		}, TRANSACTION_OPTIONS);
	} catch (error) { conflictOnRace(error); }
}

export async function voidAttempt(actor: AdultActor, requestId: string, paymentId: string, token: string,
	orderId: string | null, failed = false) {
	return getDb().$transaction(async (tx) => {
		await lockRequest(tx, actor, requestId);
		const payment = await tx.payment.findFirst({ where: activeAttempt(actor, requestId, paymentId, token), select: paymentSelect });
		if (!payment || (payment.paypalOrderId && payment.paypalOrderId !== orderId)) throw new AppError("CONFLICT");
		const voided = await tx.payment.updateMany({ where: activeAttempt(actor, requestId, paymentId, token),
			data: { status: "VOIDED", ...(orderId ? { paypalOrderId: orderId } : {}), operationToken: null, operationExpiresAt: null } });
		if (voided.count !== 1) throw new AppError("CONFLICT");
		const unlocked = await tx.shoppingBasket.updateMany({ where: { id: payment.basketId, requestId, familyId: actor.familyId,
			lockedAt: { not: null } }, data: { lockedAt: null } });
		const returned = await tx.shoppingRequest.updateMany({ where: { id: requestId, familyId: actor.familyId, status: "AWAITING_PAYMENT" },
			data: { status: "PENDING_REVIEW", revision: { increment: 1 } } });
		if (unlocked.count !== 1 || returned.count !== 1) throw new AppError("CONFLICT");
		await auditCheckout(tx, actor, requestId, failed ? "checkout.preparation_failed" : "checkout.cancelled");
		return { requestId };
	}, TRANSACTION_OPTIONS);
}

export async function releaseOperation(actor: AdultActor, requestId: string, paymentId: string, token: string, failed = true) {
	await getDb().$transaction(async (tx) => {
		await lockRequest(tx, actor, requestId);
		const released = await tx.payment.updateMany({ where: { id: paymentId, requestId, familyId: actor.familyId,
			status: "CREATED", operationToken: token }, data: { operationToken: null, operationExpiresAt: null } });
		if (released.count === 1 && failed) await auditCheckout(tx, actor, requestId, "checkout.preparation_failed");
	}, TRANSACTION_OPTIONS);
}
