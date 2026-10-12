import "server-only";
import { randomUUID } from "node:crypto";
import type { AdultActor } from "@/server/auth/require-adult";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import type { CaptureCheckoutInput } from "../schemas";
import { CheckoutFailure } from "./failure";
import { auditCheckout, lockRequest, paymentSelect, TRANSACTION_OPTIONS } from "./persistence";

export function readCapturePayment(actor: AdultActor, input: CaptureCheckoutInput) {
	return getDb().payment.findFirst({ where: { familyId: actor.familyId, requestId: input.requestId,
		paypalOrderId: input.paypalOrderId }, select: paymentSelect });
}

export async function claimCapture(actor: AdultActor, input: CaptureCheckoutInput, clientId: string, capture: boolean) {
	return getDb().$transaction(async (tx) => {
		await lockRequest(tx, actor, input.requestId);
		const payment = await tx.payment.findFirst({ where: { familyId: actor.familyId, requestId: input.requestId,
			paypalOrderId: input.paypalOrderId }, select: paymentSelect });
		if (!payment) throw new AppError("NOT_FOUND");
		if (["CAPTURED", "REFUNDED", "REVERSED"].includes(payment.status)) return { payment, token: null };
		if (payment.paypalClientId !== clientId) throw new CheckoutFailure("CONFIGURATION");
		const request = await tx.shoppingRequest.findFirst({ where: { id: input.requestId, familyId: actor.familyId },
			select: { status: true, basket: { select: { id: true, lockedAt: true, subtotalMinor: true, currency: true } } } });
		if (!["CREATED", "APPROVED", "PENDING"].includes(payment.status) || request?.status !== "AWAITING_PAYMENT"
			|| !request.basket?.lockedAt || request.basket.id !== payment.basketId || request.basket.currency !== payment.currency
			|| request.basket.subtotalMinor !== payment.amountMinor) throw new AppError("CONFLICT");
		const now = new Date();
		if (payment.operationExpiresAt && payment.operationExpiresAt > now) throw new CheckoutFailure("IN_PROGRESS");
		const token = randomUUID();
		const captureStartedAt = capture ? payment.captureStartedAt ?? now : payment.captureStartedAt;
		const updated = await tx.payment.updateMany({ where: { id: payment.id, familyId: actor.familyId,
			status: payment.status, OR: [{ operationExpiresAt: null }, { operationExpiresAt: { lte: now } }] },
			data: { operationToken: token, operationExpiresAt: new Date(now.getTime() + 90_000), captureStartedAt } });
		if (updated.count !== 1) throw new CheckoutFailure("IN_PROGRESS");
		if (capture) await auditCheckout(tx, actor, input.requestId, "payment.capture_started");
		return { payment: { ...payment, captureStartedAt }, token };
	}, TRANSACTION_OPTIONS);
}

export async function releaseCapture(actor: AdultActor, input: CaptureCheckoutInput, token: string,
	verificationFailed: boolean) {
	await getDb().$transaction(async (tx) => {
		await lockRequest(tx, actor, input.requestId);
		const result = await tx.payment.updateMany({ where: { familyId: actor.familyId, requestId: input.requestId,
			paypalOrderId: input.paypalOrderId, operationToken: token },
			data: { operationToken: null, operationExpiresAt: null } });
		if (result.count) await auditCheckout(tx, actor, input.requestId,
			verificationFailed ? "payment.verification_failed" : "payment.capture_unknown");
	}, TRANSACTION_OPTIONS);
}
