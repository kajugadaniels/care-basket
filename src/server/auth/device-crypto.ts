import "server-only";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getDeviceEnv } from "@/lib/env/server";

export function generatePairingCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
export function generateDeviceSecret() { return randomBytes(32).toString("base64url"); }
export function hashSecret(secret: string) { return createHash("sha256").update(secret).digest("hex"); }
export function keyedHash(value: string) {
  return createHmac("sha256", Buffer.from(getDeviceEnv().DEVICE_AUTH_SECRET, "base64url"))
    .update(value).digest("hex");
}
export function hashPairingCode(code: string) { return keyedHash(code); }
export function createReviewTicket(userId: string, familyId: string, pairingId: string, expiresAt: string) {
  return keyedHash(`review:${userId}:${familyId}:${pairingId}:${expiresAt}`);
}
export function hashesMatch(actual: string, expected: string) {
  if (!/^[a-f0-9]{64}$/.test(actual) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}
