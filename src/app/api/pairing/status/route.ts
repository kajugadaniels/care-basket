import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { devicesCopy } from "@/features/devices/copy";
import { getPairingStatus } from "@/features/devices/server/service";
import { AppError } from "@/server/errors";
import { logSecurityFailure } from "@/server/logger";
import { RateLimitError } from "@/server/rate-limit/limiter";

export async function GET() {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  try { return Response.json({ data: await getPairingStatus() }, { headers }); }
  catch (error) {
    unstable_rethrow(error);
    const requestId = randomUUID();
    const code = error instanceof AppError ? error.code : "INTERNAL";
    const status = code === "UNAUTHENTICATED" ? 401 : code === "RATE_LIMITED" ? 429 : 500;
    if (error instanceof RateLimitError) headers["Retry-After"] = String(error.retryAfter);
    if (status === 500) logSecurityFailure({ event: "pairing.status_failed", requestId, actorType: "SYSTEM", code });
    return Response.json({ error: { code, message: devicesCopy.errors[code as keyof typeof devicesCopy.errors] ?? devicesCopy.errors.INTERNAL, requestId } }, { status, headers });
  }
}
