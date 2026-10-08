import "server-only";
import { isIP } from "node:net";
import { z } from "zod";
import { getDeviceEnv } from "@/lib/env/server";
import { keyedHash } from "@/server/auth/device-crypto";
import { AppError } from "@/server/errors";

export function pairingStartKey(headers: { get(name: string): string | null }) {
  const env = getDeviceEnv();
  if (env.NODE_ENV !== "production" && env.DEVICE_IP_SOURCE === "unconfigured") {
    return `pairing-start:${keyedHash("local-development-shared")}`;
  }
  if (env.DEVICE_IP_SOURCE !== "vercel" || env.VERCEL !== "1") throw new AppError("INTERNAL");
  // Trusted only when Vercel is the ingress. Never fall back to arbitrary forwarded headers.
  const parsed = z.string().max(45).refine((value) => isIP(value) !== 0)
    .safeParse(headers.get("x-vercel-forwarded-for"));
  if (!parsed.success) throw new AppError("INTERNAL");
  // Canonicalize IPv6 before hashing so alternate spellings cannot yield new buckets.
  const ip = isIP(parsed.data) === 6 ? new URL(`http://[${parsed.data}]/`).hostname : parsed.data;
  return `pairing-start:${keyedHash(ip)}`;
}
