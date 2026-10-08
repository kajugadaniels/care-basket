import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

export type AuthenticatedUser = {
  clerkUserId: string;
  // First name only, for greetings. Null when the account has none.
  firstName: string | null;
};

/**
 * Requires a signed-in Clerk session and redirects visitors to sign-in otherwise.
 * Call it in every protected page and Server Function: layouts alone are not enough.
 *
 * This proves authentication only. Family membership and roles are checked by
 * requireAdult(), which arrives with database-backed families (authentication.md § 9).
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn();
  }

  const user = await currentUser();
  return {
    clerkUserId: userId,
    firstName: user?.firstName?.trim() || null,
  };
}
