import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AdultActor } from "@/server/auth/require-adult";
import type { DeviceActor } from "@/server/auth/device-policy";

type RequestEvent = "request.submitted" | "request.cancelled" | "request.declined" | "basket.item_updated" | "basket.item_removed";

// The caller supplies its transaction: failure to audit rolls back the mutation.
export async function writeRequestEvent(tx: Prisma.TransactionClient, actor: AdultActor | DeviceActor, requestId: string, action: RequestEvent) {
	await tx.auditLog.create({
		data: {
			familyId: actor.familyId, actorType: actor.type === "adult" ? "ADULT" : "DEVICE",
			actorId: actor.type === "adult" ? actor.userId : actor.deviceId,
			action, targetType: "ShoppingRequest", targetId: requestId,
		},
		select: { id: true },
	});
}
