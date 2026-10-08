import "server-only";
import { redirect } from "next/navigation";
import type { FamilyRole } from "@/generated/prisma/enums";
import { ensureUser } from "@/server/auth/ensure-user";
import { findFamilyMembership } from "@/server/auth/family-membership";
import { AppError } from "@/server/errors";

export type AdultActor = {
  type: "adult";
  // CareBasket user ID (not the Clerk ID).
  userId: string;
  familyId: string;
  role: FamilyRole;
};

type RequireAdultOptions = {
  // Roles allowed to continue. Defaults to every family role.
  roles?: readonly FamilyRole[];
};

/**
 * Resolves the signed-in adult and their family from the Clerk session and the database only.
 * It takes no IDs from callers, so a browser cannot choose its own family or role.
 *
 * - No session: redirects to sign-in (the Clerk dialog).
 * - Signed in without a family: redirects to /family/setup.
 * - Role not allowed: throws AppError("FORBIDDEN").
 */
export async function requireAdult(options: RequireAdultOptions = {}): Promise<AdultActor> {
  const user = await ensureUser();
  const membership = await findFamilyMembership(user.id);
  if (!membership) {
    redirect("/family/setup");
  }

  if (options.roles && !options.roles.includes(membership.role)) {
    throw new AppError("FORBIDDEN");
  }

  return {
    type: "adult",
    userId: user.id,
    familyId: membership.familyId,
    role: membership.role,
  };
}
