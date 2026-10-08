import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db/client";
import { writeDeviceEvent } from "@/server/audit/write-device-event";
import { serializable } from "@/server/db/serializable";
import { AppError } from "@/server/errors";
import { counterBlocked, consumeCounter } from "@/server/rate-limit/limiter";

const pendingSelect = { id: true, createdAt: true, expiresAt: true, userAgentSummary: true } satisfies Prisma.DevicePairingSelect;
type ManagerContext = { familyId: string; userId: string };

export async function insertPairing(data: {
  codeHash: string; secretHash: string; expiresAt: Date; userAgentSummary: string;
}, now: Date, oldSecretHash?: string) {
  return getDb().$transaction(async (tx) => {
    // Releases stale reservations within this POST operation, never during a GET poll.
    await tx.devicePairing.updateMany({
      where: { expiresAt: { lte: now }, activeCodeHash: { not: null } },
      data: { status: "EXPIRED", activeCodeHash: null },
    });
    if (oldSecretHash) await tx.devicePairing.updateMany({
      where: { secretHash: oldSecretHash, status: { in: ["PENDING", "APPROVED"] } },
      data: { status: "EXPIRED", activeCodeHash: null },
    });
    const pairing = await tx.devicePairing.create({
      data: { ...data, activeCodeHash: data.codeHash }, select: { id: true },
    });
    await writeDeviceEvent(tx, { familyId: null, actorType: "SYSTEM", actorId: pairing.id,
      action: "pairing.requested", targetType: "DevicePairing", targetId: pairing.id });
    return pairing;
  });
}

export async function lookupPending(context: ManagerContext, codeHash: string, now: Date) {
  // Serializes failure budgets across concurrent attempts by this adult. Only failures count.
  return serializable(async (tx) => {
    const shortKey = `pairing-failed-short:${context.userId}`;
    const dayKey = `pairing-failed-day:${context.userId}`;
    const shortRetry = await counterBlocked(tx, shortKey, 5, 15 * 60_000, now);
    const dayRetry = await counterBlocked(tx, dayKey, 20, 24 * 60 * 60_000, now);
    if (shortRetry || dayRetry) return { pairing: null, limited: true };
    const pairing = await tx.devicePairing.findFirst({
      where: { activeCodeHash: codeHash, status: "PENDING", expiresAt: { gt: now }, familyId: null }, select: pendingSelect,
    });
    if (pairing) return { pairing, limited: false };
    const short = await consumeCounter(shortKey, 5, 15 * 60_000, now, tx);
    const day = await consumeCounter(dayKey, 20, 24 * 60 * 60_000, now, tx);
    if (short.count === 5 || day.count === 20) await writeDeviceEvent(tx, {
      familyId: context.familyId, actorType: "ADULT", actorId: context.userId, action: "pairing.lookup_limited",
      targetType: "User", targetId: context.userId,
    });
    return { pairing: null, limited: short.count >= 5 || day.count >= 20 };
  });
}

export async function listDeviceRecords(familyId: string, after?: string) {
  return getDb().authorizedDevice.findMany({
    where: { familyId, ...(after ? { id: { gt: after } } : {}) }, orderBy: { id: "asc" }, take: 50,
    select: { id: true, label: true, userAgentSummary: true, createdAt: true, lastSeenAt: true,
      expiresAt: true, revokedAt: true, profile: { select: { displayName: true } } },
  });
}
export async function hasMoreDevices(familyId: string, after: string) {
  return (await getDb().authorizedDevice.findFirst({
    where: { familyId, id: { gt: after } }, select: { id: true },
  })) !== null;
}
export async function revokeDevice(context: ManagerContext, deviceId: string, now: Date) {
  return getDb().$transaction(async (tx) => {
    const device = await tx.authorizedDevice.findFirst({
      where: { id: deviceId, familyId: context.familyId }, select: { id: true, revokedAt: true },
    });
    if (!device) throw new AppError("NOT_FOUND");
    const result = await tx.authorizedDevice.updateMany({
      where: { id: deviceId, familyId: context.familyId, revokedAt: null },
      data: { revokedAt: now, revokedByUserId: context.userId },
    });
    if (result.count) await writeDeviceEvent(tx, { familyId: context.familyId,
      actorType: "ADULT", actorId: context.userId, action: "device.revoked",
      targetType: "AuthorizedDevice", targetId: deviceId });
  });
}
export async function readShopProfile(familyId: string, profileId: string, deviceId: string, now: Date, idleSince: Date) {
  return getDb().managedProfile.findFirst({
    where: { id: profileId, familyId, devices: { some: { id: deviceId, familyId, profileId,
      revokedAt: null, expiresAt: { gt: now }, lastSeenAt: { gt: idleSince } } } },
    select: { displayName: true, avatarKey: true },
  });
}
