import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { writeDeviceEvent } from "@/server/audit/write-device-event";
import { serializable } from "@/server/db/serializable";
import { AppError } from "@/server/errors";
import { DEVICE_IDLE_MS, MAX_PROFILE_DEVICES } from "@/server/auth/device-policy";

type Context = { familyId: string; userId: string };
function activeDevices(familyId: string, profileId: string, now: Date) {
  return { familyId, profileId, revokedAt: null, expiresAt: { gt: now },
    lastSeenAt: { gt: new Date(now.getTime() - DEVICE_IDLE_MS) } };
}
async function checkCapacity(tx: Prisma.TransactionClient, familyId: string, profileId: string, now: Date, reserve: boolean) {
  const profile = await tx.managedProfile.findFirst({ where: { id: profileId, familyId }, select: { id: true } });
  if (!profile) throw new AppError("NOT_FOUND");
  const active = await tx.authorizedDevice.count({ where: activeDevices(familyId, profileId, now) });
  const reservations = reserve ? await tx.devicePairing.count({
    where: { familyId, profileId, status: "APPROVED", expiresAt: { gt: now } },
  }) : 0;
  if (active + reservations >= MAX_PROFILE_DEVICES) throw new AppError("CONFLICT");
}

export async function decidePairing(context: Context, input: {
  pairingId: string; expiresAt: string; profileId?: string; label?: string;
}, decision: "APPROVED" | "REJECTED", now: Date) {
  return serializable(async (tx) => {
    const transactionNow = new Date(Math.max(now.getTime(), Date.now()));
    if (decision === "APPROVED") {
      if (!input.profileId || !input.label) throw new AppError("VALIDATION_FAILED");
      await checkCapacity(tx, context.familyId, input.profileId, transactionNow, true);
    }
    // A signed review ticket has been checked in the service. This unassigned pairing
    // becomes family-owned only through this explicit authenticated approval/rejection.
    const result = await tx.devicePairing.updateMany({
      where: { id: input.pairingId, familyId: null, status: "PENDING",
        expiresAt: { equals: new Date(input.expiresAt), gt: new Date(Math.max(transactionNow.getTime(), Date.now())) } },
      data: { status: decision, familyId: context.familyId, approvedByUserId: context.userId,
        ...(decision === "APPROVED" ? { profileId: input.profileId, label: input.label, approvedAt: transactionNow }
          : { activeCodeHash: null }) },
    });
    if (result.count !== 1) throw new AppError("CONFLICT");
    await writeDeviceEvent(tx, { familyId: context.familyId, actorType: "ADULT", actorId: context.userId,
      action: decision === "APPROVED" ? "pairing.approved" : "pairing.rejected",
      targetType: "DevicePairing", targetId: input.pairingId });
  });
}

export async function completePairingRecord(pairingId: string, secretHash: string, tokenHash: string, expiresAt: Date, now: Date) {
  return serializable(async (tx) => {
    const transactionNow = new Date(Math.max(now.getTime(), Date.now()));
    // Authentication bootstrap, bound to BOTH the resolved pairing ID and its secret hash.
    const scope = await tx.devicePairing.findFirst({
      where: { id: pairingId, secretHash, status: "APPROVED", expiresAt: { gt: transactionNow } },
      select: { familyId: true, profileId: true },
    });
    if (!scope?.familyId || !scope.profileId) throw new AppError("CONFLICT");
    const pairing = await tx.devicePairing.findFirst({
      where: { id: pairingId, secretHash, familyId: scope.familyId, profileId: scope.profileId,
        status: "APPROVED", expiresAt: { gt: transactionNow } },
      select: { approvedByUserId: true, label: true, userAgentSummary: true },
    });
    if (!pairing?.approvedByUserId || !pairing.label) throw new AppError("CONFLICT");
    const manager = await tx.familyMembership.findFirst({
      where: { familyId: scope.familyId, userId: pairing.approvedByUserId, role: { in: ["OWNER", "MANAGER"] } },
      select: { id: true },
    });
    if (!manager) throw new AppError("CONFLICT");
    await checkCapacity(tx, scope.familyId, scope.profileId, transactionNow, false);
    const transitioned = await tx.devicePairing.updateMany({
      where: { id: pairingId, familyId: scope.familyId, profileId: scope.profileId,
        secretHash, status: "APPROVED", expiresAt: { gt: new Date(Math.max(transactionNow.getTime(), Date.now())) } },
      data: { status: "COMPLETED", completedAt: transactionNow, activeCodeHash: null },
    });
    if (transitioned.count !== 1) throw new AppError("CONFLICT");
    const device = await tx.authorizedDevice.create({
      data: { familyId: scope.familyId, profileId: scope.profileId, label: pairing.label,
        approvedByUserId: pairing.approvedByUserId, userAgentSummary: pairing.userAgentSummary,
        tokenHash, expiresAt, lastSeenAt: transactionNow }, select: { id: true },
    });
    await writeDeviceEvent(tx, { familyId: scope.familyId, actorType: "DEVICE", actorId: device.id,
      action: "pairing.completed", targetType: "DevicePairing", targetId: pairingId });
    await writeDeviceEvent(tx, { familyId: scope.familyId, actorType: "DEVICE", actorId: device.id,
      action: "device.connected", targetType: "AuthorizedDevice", targetId: device.id });
  });
}
