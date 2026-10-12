import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db/client";
import { isUniqueConstraintViolation } from "@/server/db/errors";
import { logSecurityFailure } from "@/server/logger";

export type VerifiedEventInput = {
	source: "CAPTURE_RESPONSE" | "WEBHOOK" | "SYSTEM";
	paypalEventId?: string;
	eventType: string;
	resourceId?: string;
};

// Called only AFTER PayPal signature verification. Unknown/unmatched payloads remain minimal.
export async function receiveWebhook(event: VerifiedEventInput) {
	if (!event.paypalEventId) throw new Error("Missing verified event identity.");
	const db = getDb();
	try {
		return await db.paymentEvent.upsert({ where: { paypalEventId: event.paypalEventId }, update: {},
			create: { ...event, summary: "RECEIVED", verifiedAt: new Date() }, select: { id: true, processedAt: true } });
	} catch (error) {
		if (!isUniqueConstraintViolation(error)) throw error;
		// Also handle adapters that implement an empty-update upsert as read-then-insert.
		const winner = await db.paymentEvent.findUnique({ where: { paypalEventId: event.paypalEventId }, select: { id: true, processedAt: true } });
		if (!winner) throw error;
		return winner;
	}
}

export async function finishEvent(tx: Prisma.TransactionClient, event: VerifiedEventInput,
	paymentId: string | null, summary: string, amountMinor?: number, currency?: string) {
	const now = new Date();
	const data = { paymentId, summary, resourceStatus: summary, amountMinor, currency, processedAt: now };
	if (event.paypalEventId) {
		const result = await tx.paymentEvent.updateMany({ where: { paypalEventId: event.paypalEventId, processedAt: null }, data });
		return result.count === 1;
	} else {
		await tx.paymentEvent.create({ data: { ...event, ...data, verifiedAt: now }, select: { id: true } });
		return true;
	}
}

export async function finishUnmatched(event: VerifiedEventInput, summary: "UNMATCHED" | "IGNORED") {
	// No family can be derived safely; store no supplied custom_id, names, or amounts.
	await getDb().$transaction(async (tx) => { await finishEvent(tx, event, null, summary); });
	if (summary === "UNMATCHED") logSecurityFailure({ event: "webhook.unmatched", requestId: randomUUID(), actorType: "SYSTEM", code: "NOT_FOUND" });
}

export async function finishApproval(event: VerifiedEventInput, payment: { id: string; familyId: string }) {
	await getDb().$transaction(async (tx) => {
		if (await finishEvent(tx, event, payment.id, "APPROVAL_OBSERVED")) {
			await tx.auditLog.create({ data: { familyId: payment.familyId, actorType: "SYSTEM", actorId: payment.id,
				action: "payment.approval_observed", targetType: "Payment", targetId: payment.id }, select: { id: true } });
		}
	});
}

export async function recordVerificationFailure(payment: { id: string; familyId: string }) {
	await getDb().auditLog.create({ data: { familyId: payment.familyId, actorType: "SYSTEM", actorId: payment.id,
		action: "payment.verification_failed", targetType: "Payment", targetId: payment.id }, select: { id: true } });
}
