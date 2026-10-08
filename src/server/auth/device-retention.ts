import "server-only";
import { z } from "zod";
import { serializable } from "@/server/db/serializable";
import { writeDeviceEvent } from "@/server/audit/write-device-event";
import { DEVICE_IDLE_MS } from "./device-policy";

// Developer-invoked maintenance only. No route, script, cron, or automatic invocation.
// Bounded batches avoid large transactions; repeat until returned counts are zero.
export async function purgeDeviceData(familyId: string, now = new Date()) {
  z.uuid().parse(familyId);
  return serializable(async (tx) => {
    const day = 24 * 60 * 60_000;
    const devices = await tx.authorizedDevice.findMany({
      where: { familyId, OR: [{ revokedAt: { lte: new Date(now.getTime() - 30 * day) } },
        { revokedAt: null, expiresAt: { lte: new Date(now.getTime() - 30 * day) } },
        { revokedAt: null, lastSeenAt: { lte: new Date(now.getTime() - DEVICE_IDLE_MS - 30 * day) } }] },
      select: { id: true, familyId: true, revokedAt: true }, take: 50, orderBy: { id: "asc" },
    });
    for (const device of devices) {
      if (!device.revokedAt) await writeDeviceEvent(tx, { familyId: device.familyId,
        actorType: "SYSTEM", actorId: device.id, action: "device.expired", targetType: "AuthorizedDevice", targetId: device.id });
      await tx.authorizedDevice.deleteMany({ where: { id: device.id, familyId: device.familyId } });
    }
    const pairingScope = { OR: [{ familyId }, { familyId: null }] };
    const pairings = await tx.devicePairing.findMany({ where: { ...pairingScope,
      AND: [{ OR: [{ completedAt: { lte: new Date(now.getTime() - day) } },
        { completedAt: null, expiresAt: { lte: new Date(now.getTime() - day) } }] }],
    }, select: { id: true }, take: 50, orderBy: { id: "asc" } });
    await tx.devicePairing.deleteMany({ where: { ...pairingScope, id: { in: pairings.map((p) => p.id) } } });
    const counters = await tx.rateLimitCounter.findMany({ where: { expiresAt: { lte: now } },
      select: { key: true, windowStart: true }, take: 50 });
    if (counters.length) await tx.rateLimitCounter.deleteMany({ where: { OR: counters } });
    const audits = await tx.auditLog.findMany({ where: { ...pairingScope, createdAt: { lte: new Date(now.getTime() - 180 * day) } },
      select: { id: true }, take: 50, orderBy: { id: "asc" } });
    await tx.auditLog.deleteMany({ where: { ...pairingScope, id: { in: audits.map((a) => a.id) } } });
    return { devices: devices.length, pairings: pairings.length, counters: counters.length, audits: audits.length };
  });
}
