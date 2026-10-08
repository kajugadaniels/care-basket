import "server-only";
import { getDb } from "@/server/db/client";
import { isUniqueConstraintViolation } from "@/server/db/errors";

export type UserRecord = {
  id: string;
  clerkUserId: string;
};

const userSelect = { id: true, clerkUserId: true } as const;

/**
 * Returns the user for a Clerk account, creating it on first sight. Safe to call repeatedly
 * and concurrently: the unique clerkUserId constraint guarantees a single row, and a request
 * that loses the creation race reads the winner's row instead.
 */
export async function findOrCreateUserByClerkId(clerkUserId: string): Promise<UserRecord> {
  const db = getDb();

  const existing = await db.user.findUnique({ where: { clerkUserId }, select: userSelect });
  if (existing) {
    return existing;
  }

  try {
    return await db.user.create({ data: { clerkUserId }, select: userSelect });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      throw error;
    }
    return db.user.findUniqueOrThrow({ where: { clerkUserId }, select: userSelect });
  }
}
