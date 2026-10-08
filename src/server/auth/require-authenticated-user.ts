import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

export type AuthenticatedUser = {
  clerkUserId: string;
  // First name only, for greetings. Null when the account has none.
  firstName: string | null;
};

/**
 * Returns the Clerk user ID of the signed-in session and redirects visitors to sign-in
 * otherwise. The ID always comes from the verified session, never from the browser.
 */
export async function requireClerkUserId(): Promise<string> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn();
  }
  return userId;
}

/**
 * Requires a signed-in Clerk session and also loads the first name for greetings.
 * Call a session check in every protected page and Server Function: layouts alone are not enough.
 *
 * This proves authentication only. Family membership and roles are checked by
 * requireAdult() in ./require-adult.ts (authentication.md § 9).
 */
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const clerkUserId = await requireClerkUserId();
  const user = await currentUser();
  return {
    clerkUserId,
    firstName: user?.firstName?.trim() || null,
  };
}
