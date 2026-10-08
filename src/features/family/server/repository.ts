import "server-only";
import type { FamilyMembershipRecord } from "@/server/auth/family-membership";
import { getDb } from "@/server/db/client";

type CreateFamilyWithOwnerInput = {
  userId: string;
  familyName: string;
  displayName: string;
};

/**
 * Creates the family and its OWNER membership in one transaction. If the membership insert
 * fails (for example, the unique userId constraint because the user already has a family),
 * the family insert is rolled back too, so no orphaned family remains.
 */
export async function createFamilyWithOwner(
  input: CreateFamilyWithOwnerInput,
): Promise<FamilyMembershipRecord> {
  return getDb().$transaction(async (tx) => {
    const family = await tx.family.create({
      data: { name: input.familyName },
      select: { id: true, name: true },
    });

    const membership = await tx.familyMembership.create({
      data: {
        familyId: family.id,
        userId: input.userId,
        role: "OWNER",
        displayName: input.displayName,
      },
      select: { role: true, displayName: true },
    });

    return {
      familyId: family.id,
      familyName: family.name,
      role: membership.role,
      displayName: membership.displayName,
    };
  });
}
