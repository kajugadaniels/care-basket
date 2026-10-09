import "server-only";
import { z } from "zod";
import { getDb } from "@/server/db/client";

// Developer-invoked maintenance only: no route, cron, script or automatic invocation.
// Final requests are immutable in Step 7; updatedAt is their final-transition timestamp.
// Future fulfillment mutations must preserve or replace this timestamp before rollout.
export async function purgeRequestInputText(familyId: string, now = new Date()) {
	z.uuid().parse(familyId);
	const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60_000);
	return getDb().$transaction(async (tx) => {
		const scope = { familyId, inputText: { not: null }, status: { in: ["DECLINED", "CANCELLED"] as ("DECLINED" | "CANCELLED")[] },
			updatedAt: { lte: cutoff } };
		const rows = await tx.shoppingRequest.findMany({ where: scope, select: { id: true }, take: 50, orderBy: { id: "asc" } });
		if (!rows.length) return { cleared: 0 };
		const result = await tx.shoppingRequest.updateMany({ where: { ...scope, id: { in: rows.map((row) => row.id) } }, data: { inputText: null } });
		await tx.auditLog.create({ data: { familyId, actorType: "SYSTEM", actorId: familyId,
			action: "request.input_text_cleared", targetType: "Family", targetId: familyId } });
		return { cleared: result.count };
	});
}
