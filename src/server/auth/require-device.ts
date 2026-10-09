import "server-only";
import { io } from "next/cache";
import { AppError } from "@/server/errors";
import { getDb } from "@/server/db/client";
import { resolveDeviceSession } from "./device-session";
import { DEVICE_ACTIVITY_MS, DEVICE_IDLE_MS, type DeviceActor } from "./device-policy";

// Device routes ignore Clerk entirely, even when both cookies coexist.
export async function requireDevice(): Promise<DeviceActor> {
  await io();
  const now = new Date();
  const device = await resolveDeviceSession(now);
  if (!device) throw new AppError("UNAUTHENTICATED");
  if (now.getTime() - device.lastSeenAt.getTime() >= DEVICE_ACTIVITY_MS) {
    await getDb().authorizedDevice.updateMany({
      where: { id: device.id, familyId: device.familyId, profileId: device.profileId,
        revokedAt: null, expiresAt: { gt: now },
        lastSeenAt: { gt: new Date(now.getTime() - DEVICE_IDLE_MS), lte: new Date(now.getTime() - DEVICE_ACTIVITY_MS) } },
      data: { lastSeenAt: now },
    });
  }
  return { type: "device", deviceId: device.id, familyId: device.familyId,
    profileId: device.profileId, profileKind: device.profile.kind };
}

export function assertDevicePermission(actor: DeviceActor, capability: "view-own-home" | "create-own-request" | "view-own-requests") {
  if (!actor || actor.type !== "device" || !["ASSISTED_ADULT", "CHILD"].includes(actor.profileKind)
    || !["view-own-home", "create-own-request", "view-own-requests"].includes(capability)) {
    throw new AppError("FORBIDDEN");
  }
}
