import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type DeviceEvent = {
  familyId: string | null; actorType: "ADULT" | "DEVICE" | "SYSTEM"; actorId: string;
  action: "pairing.requested" | "pairing.approved" | "pairing.rejected" | "pairing.completed"
    | "pairing.lookup_limited" | "device.connected" | "device.revoked" | "device.expired";
  targetType: "DevicePairing" | "AuthorizedDevice" | "User"; targetId: string;
};
export async function writeDeviceEvent(tx: Prisma.TransactionClient, event: DeviceEvent) {
  await tx.auditLog.create({ data: event, select: { id: true } });
}
