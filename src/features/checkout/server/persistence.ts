import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AdultActor } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";

export const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 };
// Stop capture replay before PayPal's documented six-hour default retention.
export const CAPTURE_REPLAY_WINDOW_MS = 5 * 60 * 60_000;
export const OPEN_PAYMENT_STATUSES = ["CREATED", "APPROVED", "PENDING"] as const;
export const paymentSelect = {
	id: true, familyId: true, requestId: true, basketId: true, status: true,
	amountMinor: true, currency: true, paypalOrderId: true, paypalClientId: true, orderItems: true,
	creationStartedAt: true, operationToken: true, operationExpiresAt: true,
	captureStartedAt: true, paypalCaptureId: true, capturedAt: true,
} satisfies Prisma.PaymentSelect;
export type PaymentAttempt = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

// Same request-row mutex as Step 7's conditional edits. All checkout writes lock it first.
export async function lockRequest(tx: Prisma.TransactionClient, actor: AdultActor, requestId: string) {
	const result = await tx.shoppingRequest.updateMany({
		where: { id: requestId, familyId: actor.familyId }, data: { revision: { increment: 0 } },
	});
	if (result.count !== 1) throw new AppError("NOT_FOUND");
}

export async function auditCheckout(tx: Prisma.TransactionClient, actor: AdultActor, requestId: string,
	action: "checkout.started" | "checkout.order_created" | "checkout.preparation_failed" | "checkout.cancelled" | "checkout.price_conflict"
		| "payment.capture_started" | "payment.capture_unknown" | "payment.verification_failed") {
	await tx.auditLog.create({ data: { familyId: actor.familyId, actorType: "ADULT", actorId: actor.userId,
		action, targetType: "ShoppingRequest", targetId: requestId }, select: { id: true } });
}

export function conflictOnRace(error: unknown): never {
	if (typeof error === "object" && error !== null && "code" in error && ["P2002", "P2034"].includes(String(error.code))) {
		throw new AppError("CONFLICT");
	}
	throw error;
}
