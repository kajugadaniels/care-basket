import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";

export class RateLimitError extends AppError {
  constructor(readonly retryAfter: number) { super("RATE_LIMITED"); }
}
export function rateWindow(now: Date, duration: number) {
  const start = new Date(Math.floor(now.getTime() / duration) * duration);
  return { start, end: new Date(start.getTime() + duration) };
}
// A single bounded UPSERT locks the row, including the first concurrent insert.
// Saturating at limit + 1 avoids overflow under repeated rejected traffic.
export async function consumeCounter(key: string, limit: number, duration: number, now: Date, tx?: Prisma.TransactionClient) {
  const { start, end } = rateWindow(now, duration);
  const rows = await (tx ?? getDb()).$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitCounter" ("key", "windowStart", "count", "expiresAt")
    VALUES (${key}, ${start}, 1, ${end})
    ON CONFLICT ("key", "windowStart") DO UPDATE
    SET "count" = LEAST("RateLimitCounter"."count" + 1, ${limit + 1})
    RETURNING "count"
  `;
  if (!rows[0]) throw new AppError("INTERNAL");
  return { count: rows[0].count, retryAfter: Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 1000)) };
}
export async function enforceRateLimit(key: string, limit: number, duration: number, now = new Date()) {
  const result = await consumeCounter(key, limit, duration, now);
  if (result.count > limit) throw new RateLimitError(result.retryAfter);
}
export async function counterBlocked(tx: Prisma.TransactionClient, key: string, limit: number, duration: number, now: Date) {
  const { start, end } = rateWindow(now, duration);
  const row = await tx.rateLimitCounter.findUnique({
    where: { key_windowStart: { key, windowStart: start } }, select: { count: true },
  });
  return row && row.count >= limit ? Math.max(1, Math.ceil((end.getTime() - now.getTime()) / 1000)) : 0;
}
