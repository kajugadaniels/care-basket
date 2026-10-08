import "server-only";
import { cache } from "react";
import type { FamilyRole } from "@/generated/prisma/enums";
import { getDb } from "@/server/db/client";

export type FamilyMembershipRecord = {
  familyId: string;
  familyName: string;
  role: FamilyRole;
  displayName: string;
};

/**
 * Reads the family membership of a CareBasket user, or null if they have not set up a family.
 * Callers pass a user ID resolved from the session, never one from the browser.
 * Always queries the database; use it when a fresh read matters (for example, after a write race).
 */
export async function readFamilyMembership(userId: string): Promise<FamilyMembershipRecord | null> {
  const membership = await getDb().familyMembership.findUnique({
    where: { userId },
    select: {
      role: true,
      displayName: true,
      family: { select: { id: true, name: true } },
    },
  });
  if (!membership) {
    return null;
  }

  return {
    familyId: membership.family.id,
    familyName: membership.family.name,
    role: membership.role,
    displayName: membership.displayName,
  };
}

// Same read, deduplicated within one request (for example, requireAdult and the page).
// React's cache() is scoped to a single request; nothing is shared between users or requests.
export const findFamilyMembership = cache(readFamilyMembership);
