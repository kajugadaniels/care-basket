import "server-only";
import { ADULT_ACCESS_CONSENT_VERSION } from "@/lib/audience";
import type { FamilyMembershipRecord } from "@/server/auth/family-membership";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";

type CreateFamilyWithOwnerInput = {
  userId: string;
  familyName: string;
  displayName: string;
	adultConfirmed: true;
};

/**
 * Creates the family and its OWNER membership in one transaction. If the membership insert
 * fails (for example, the unique userId constraint because the user already has a family),
 * the family insert is rolled back too, so no orphaned family remains.
 */
export async function createFamilyWithOwner(
  input: CreateFamilyWithOwnerInput,
): Promise<FamilyMembershipRecord> {
	if (input.adultConfirmed !== true) throw new AppError("VALIDATION_FAILED");
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

		// Record self-attestation, not a verified age or date of birth.
		await tx.auditLog.create({
			data: {
				familyId: family.id,
				actorType: "ADULT",
				actorId: input.userId,
				action: `family.created.${ADULT_ACCESS_CONSENT_VERSION}`,
				targetType: "Family",
				targetId: family.id,
			},
			select: { id: true },
		});

    return {
      familyId: family.id,
      familyName: family.name,
      role: membership.role,
      displayName: membership.displayName,
    };
  });
}
