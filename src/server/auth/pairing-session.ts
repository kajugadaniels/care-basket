import "server-only";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { readDeviceCookie } from "./device-cookies";
import { hashSecret } from "./device-crypto";

export async function requirePairingSession() {
  const secret = await readDeviceCookie("pairing");
  if (!secret) throw new AppError("UNAUTHENTICATED");
  // Authentication bootstrap: secret hash, not a caller-supplied family or pairing ID.
  const pairing = await getDb().devicePairing.findUnique({
    where: { secretHash: hashSecret(secret) },
    select: { id: true, secretHash: true, status: true, expiresAt: true },
  });
  if (!pairing) throw new AppError("UNAUTHENTICATED");
  return pairing;
}
