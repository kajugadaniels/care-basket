import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db/client";

// Developer-invoked maintenance only: no route, cron, script or automatic invocation.
// Payment reconciliation can touch updatedAt without changing the final status.
// For paid requests, anchor retention to the verified capture instead of that mutable field.
export async function purgeRequestInputText(familyId: string, now = new Date()) {
	z.uuid().parse(familyId);
	const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60_000);
	return getDb().$transaction(async (tx) => {
		const scope: Prisma.ShoppingRequestWhereInput = {
			familyId, inputText: { not: null },
			OR: [
				{ status: { in: ["DECLINED", "CANCELLED"] }, updatedAt: { lte: cutoff } },
				{ status: "PAID", payments: { some: {
					familyId, status: { in: ["CAPTURED", "REFUNDED", "REVERSED"] }, capturedAt: { lte: cutoff },
				} } },
			],
		};
		const rows = await tx.shoppingRequest.findMany({ where: scope, select: { id: true }, take: 50, orderBy: { id: "asc" } });
		if (!rows.length) return { cleared: 0 };
		const result = await tx.shoppingRequest.updateMany({ where: { ...scope, id: { in: rows.map((row) => row.id) } }, data: { inputText: null } });
		await tx.auditLog.create({ data: { familyId, actorType: "SYSTEM", actorId: familyId,
			action: "request.input_text_cleared", targetType: "Family", targetId: familyId } });
		return { cleared: result.count };
	});
}
