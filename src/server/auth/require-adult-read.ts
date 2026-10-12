import "server-only";
import { auth } from "@clerk/nextjs/server";
import { AppError } from "@/server/errors";
import { findExistingAdultByClerkId } from "@/server/users/user-repository";
import type { AdultActor } from "./require-adult";

/** Read-only API guard: never provision users, redirect, or change cookies during GET. */
export async function requireAdultRead(): Promise<AdultActor> {
	const { userId: clerkUserId } = await auth();
	if (!clerkUserId) throw new AppError("UNAUTHENTICATED");

	const user = await findExistingAdultByClerkId(clerkUserId);
	const membership = user?.membership;
	if (!user || !membership || !["OWNER", "MANAGER"].includes(membership.role)) {
		throw new AppError("FORBIDDEN");
	}

	return { type: "adult", userId: user.id, familyId: membership.familyId, role: membership.role };
}
