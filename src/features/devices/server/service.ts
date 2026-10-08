import "server-only";
import { z } from "zod";
import { PROFILE_AVATAR_KEYS } from "@/features/profiles/presets";
import { createReviewTicket, generateDeviceSecret, generatePairingCode, hashesMatch, hashPairingCode, hashSecret } from "@/server/auth/device-crypto";
import { summarizeBrowser } from "@/server/auth/browser-summary";
import { DEVICE_IDLE_MS, DEVICE_LIFETIME_MS, PAIRING_TTL_MS, type DeviceActor } from "@/server/auth/device-policy";
import { assertDevicePermission } from "@/server/auth/require-device";
import type { AdultActor } from "@/server/auth/require-adult";
import { requirePairingSession } from "@/server/auth/pairing-session";
import { isUniqueConstraintViolation } from "@/server/db/errors";
import { AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit/limiter";
import { approvePairingSchema, deviceListSchema, lookupPairingSchema, rejectPairingSchema, revokeDeviceSchema } from "../schemas";
import type { DeviceDto, PairingReviewDto, PairingStatus, ShopHomeDto } from "../types";
import { completePairingRecord, decidePairing } from "./pairing-repository";
import { hasMoreDevices, insertPairing, listDeviceRecords, lookupPending, readShopProfile, revokeDevice } from "./repository";

function assertManager(actor: AdultActor) {
  if (!actor || actor.type !== "adult" || !["OWNER", "MANAGER"].includes(actor.role)) throw new AppError("FORBIDDEN");
}
export async function startPairing(userAgent: unknown, oldSecret: string | null) {
  const now = new Date();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generatePairingCode();
    const secret = generateDeviceSecret();
    const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS);
    try {
      await insertPairing({ codeHash: hashPairingCode(code), secretHash: hashSecret(secret),
        expiresAt, userAgentSummary: summarizeBrowser(userAgent) }, now, oldSecret ? hashSecret(oldSecret) : undefined);
      // Internal action-only result. Never serialize the secret to a Client Component.
      return { secret, code, expiresAt };
    } catch (error) { if (!isUniqueConstraintViolation(error)) throw error; }
  }
  throw new AppError("CONFLICT");
}
export async function reviewPairing(actor: AdultActor, input: unknown): Promise<PairingReviewDto> {
  assertManager(actor);
  const parsed = lookupPairingSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_FAILED");
  const result = await lookupPending(actor, hashPairingCode(parsed.data.code), new Date());
  if (result.limited) throw new AppError("RATE_LIMITED");
  if (!result.pairing) throw new AppError("NOT_FOUND");
  const p = result.pairing;
  const expiresAt = p.expiresAt.toISOString();
  return { pairingId: p.id, expiresAt, createdAt: p.createdAt.toISOString(), userAgentSummary: p.userAgentSummary,
    reviewTicket: createReviewTicket(actor.userId, actor.familyId, p.id, expiresAt) };
}
function assertReview(actor: AdultActor, input: { pairingId: string; expiresAt: string; reviewTicket: string }) {
  if (!hashesMatch(input.reviewTicket, createReviewTicket(actor.userId, actor.familyId, input.pairingId, input.expiresAt))) {
    throw new AppError("NOT_FOUND");
  }
}
export async function approvePairing(actor: AdultActor, input: unknown) {
  assertManager(actor);
  const parsed = approvePairingSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_FAILED");
  assertReview(actor, parsed.data);
  await decidePairing(actor, parsed.data, "APPROVED", new Date());
}
export async function rejectPairing(actor: AdultActor, input: unknown) {
  assertManager(actor);
  const parsed = rejectPairingSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_FAILED");
  assertReview(actor, parsed.data);
  await decidePairing(actor, parsed.data, "REJECTED", new Date());
}
export async function getPairingStatus(): Promise<{ status: PairingStatus }> {
  const pairing = await requirePairingSession();
  await enforceRateLimit(`pairing-poll:${pairing.id}`, 30, 60_000);
  // Expiry is derived, not persisted: GET never changes a pairing record or cookie.
  const status = ["COMPLETED", "REJECTED"].includes(pairing.status) ? pairing.status
    : pairing.expiresAt.getTime() <= Date.now() ? "EXPIRED" : pairing.status;
  return { status };
}
export async function completePairing() {
  const pairing = await requirePairingSession();
  const now = new Date();
  if (pairing.status !== "APPROVED" || pairing.expiresAt <= now) throw new AppError("CONFLICT");
  const secret = generateDeviceSecret();
  const expiresAt = new Date(now.getTime() + DEVICE_LIFETIME_MS);
  await completePairingRecord(pairing.id, pairing.secretHash, hashSecret(secret), expiresAt, now);
  return { secret, expiresAt };
}
export async function listDevices(actor: AdultActor, input: unknown = {}) {
  assertManager(actor);
  const parsed = deviceListSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_FAILED");
  const rows = await listDeviceRecords(actor.familyId, parsed.data.after);
  const now = Date.now();
  const devices: DeviceDto[] = rows.map((d) => ({ id: d.id, label: d.label, profileName: d.profile.displayName,
    userAgentSummary: d.userAgentSummary, createdAt: d.createdAt.toISOString(), lastSeenAt: d.lastSeenAt.toISOString(),
    status: d.revokedAt ? "REVOKED" : d.expiresAt.getTime() <= now || d.lastSeenAt.getTime() <= now - DEVICE_IDLE_MS ? "EXPIRED" : "ACTIVE" }));
  const lastId = rows.at(-1)?.id;
  return { devices, nextCursor: lastId && await hasMoreDevices(actor.familyId, lastId) ? lastId : null };
}
export async function disconnectDevice(actor: AdultActor, input: unknown) {
  assertManager(actor);
  const parsed = revokeDeviceSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_FAILED");
  await revokeDevice(actor, parsed.data.deviceId, new Date());
}
export async function getShopHome(actor: DeviceActor): Promise<ShopHomeDto> {
  assertDevicePermission(actor, "view-own-home");
  const now = new Date();
  const profile = await readShopProfile(actor.familyId, actor.profileId, actor.deviceId, now, new Date(now.getTime() - DEVICE_IDLE_MS));
  if (!profile) throw new AppError("UNAUTHENTICATED");
  return { displayName: profile.displayName, avatarKey: z.enum(PROFILE_AVATAR_KEYS).catch("smile").parse(profile.avatarKey) };
}
