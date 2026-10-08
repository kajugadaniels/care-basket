import "server-only";
import { requireClerkUserId } from "@/server/auth/require-authenticated-user";
import { findOrCreateUserByClerkId, type UserRecord } from "@/server/users/user-repository";

/**
 * Requires a Clerk session, then returns the matching CareBasket user, creating it on the
 * first visit. No webhook is involved, and no Clerk token or profile data is stored.
 */
export async function ensureUser(): Promise<UserRecord> {
  const clerkUserId = await requireClerkUserId();
  return findOrCreateUserByClerkId(clerkUserId);
}
