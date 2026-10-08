import "server-only";
import { getDb } from "@/server/db/client";
import { readDeviceCookie } from "./device-cookies";
import { hashSecret } from "./device-crypto";
import { DEVICE_IDLE_MS } from "./device-policy";

export async function resolveDeviceSession(now = new Date()) {
  const secret = await readDeviceCookie("device");
  if (!secret) return null;
  const tokenHash = hashSecret(secret);
  // Resolve only opaque scope first; then make a family/profile-scoped validity query.
  const scope = await getDb().authorizedDevice.findUnique({
    where: { tokenHash }, select: { id: true, familyId: true, profileId: true },
  });
  if (!scope) return null;
  return getDb().authorizedDevice.findFirst({
    where: { id: scope.id, familyId: scope.familyId, profileId: scope.profileId, tokenHash,
      revokedAt: null, expiresAt: { gt: now }, lastSeenAt: { gt: new Date(now.getTime() - DEVICE_IDLE_MS) },
      profile: { is: { id: scope.profileId, familyId: scope.familyId } } },
    select: { id: true, familyId: true, profileId: true, lastSeenAt: true,
      profile: { select: { kind: true } } },
  });
}
