import "server-only";
import type { CreateFamilyInput } from "@/features/family/schemas";
import type { FamilyOverview } from "@/features/family/types";
import {
  findFamilyMembership,
  readFamilyMembership,
  type FamilyMembershipRecord,
} from "@/server/auth/family-membership";
import type { AdultActor } from "@/server/auth/require-adult";
import { isUniqueConstraintViolation } from "@/server/db/errors";
import { AppError } from "@/server/errors";
import { createFamilyWithOwner } from "./repository";

export type CreateFamilyOutcome = {
  status: "created" | "existing";
  family: FamilyMembershipRecord;
};

/**
 * Creates a family with the user as OWNER, unless the user already belongs to one.
 * An existing family is returned unchanged (never renamed or overwritten). That also makes
 * duplicate and concurrent submissions resolve to a single family: the database's unique
 * userId constraint rejects the second membership, and its transaction rolls back.
 */
export async function createFamilyForUser(
  userId: string,
  input: CreateFamilyInput,
): Promise<CreateFamilyOutcome> {
  const existing = await findFamilyMembership(userId);
  if (existing) {
    return { status: "existing", family: existing };
  }

  try {
    const family = await createFamilyWithOwner({ userId, ...input });
    return { status: "created", family };
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) {
      throw error;
    }
    // Another request for the same account created the family first. The cached lookup above
    // still holds null for this request, so read the winner with a fresh, uncached query.
    const winner = await readFamilyMembership(userId);
    if (!winner) {
      throw error;
    }
    return { status: "existing", family: winner };
  }
}

/**
 * The dashboard view of the actor's own family. The lookup is keyed by the actor's user ID,
 * which comes from the session, and cross-checked against the actor's family ID.
 */
export async function getFamilyOverview(actor: AdultActor): Promise<FamilyOverview> {
  const membership = await findFamilyMembership(actor.userId);
  if (!membership || membership.familyId !== actor.familyId) {
    throw new AppError("NOT_FOUND");
  }

  return {
    familyName: membership.familyName,
    displayName: membership.displayName,
    role: membership.role,
  };
}
