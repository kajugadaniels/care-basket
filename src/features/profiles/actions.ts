"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import { profilesCopy } from "./copy";
import { createManagedProfileSchema, deleteManagedProfileSchema, updateManagedProfileSchema } from "./schemas";
import { createManagedProfile, deleteManagedProfile, updateManagedProfile } from "./server/service";
import type { ProfileMutationResult } from "./types";

function validationFailure(error: z.ZodError): ProfileMutationResult {
  return { ok: false, error: {
    code: "VALIDATION_FAILED", message: profilesCopy.validationSummary,
    fieldErrors: z.flattenError(error).fieldErrors,
  } };
}

function mutationFailure(error: unknown): ProfileMutationResult {
  // Preserve Clerk/setup redirects and Next.js request-time interrupts.
  unstable_rethrow(error);
  if (error instanceof AppError) {
    const messages = {
      FORBIDDEN: profilesCopy.errors.forbidden,
      UNAUTHENTICATED: profilesCopy.errors.unauthenticated,
      NOT_FOUND: profilesCopy.errors.notFound,
      VALIDATION_FAILED: profilesCopy.validationSummary,
    };
    return { ok: false, error: {
      code: error.code, message: messages[error.code as keyof typeof messages] ?? profilesCopy.errors.internal,
    } };
  }
  console.error("profiles.mutation_failed", { requestId: randomUUID(), code: "INTERNAL" });
  return { ok: false, error: { code: "INTERNAL", message: profilesCopy.errors.internal } };
}

export async function createManagedProfileAction(input: unknown): Promise<ProfileMutationResult> {
  let profileId: string;
  try {
    const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
    const parsed = createManagedProfileSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    ({ profileId } = await createManagedProfile(actor, parsed.data));
  } catch (error) {
    return mutationFailure(error);
  }
  revalidatePath("/family", "layout");
  redirect(`/family/members/${profileId}`);
}

export async function updateManagedProfileAction(input: unknown): Promise<ProfileMutationResult> {
  let profileId: string;
  try {
    const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
    const parsed = updateManagedProfileSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    ({ profileId } = await updateManagedProfile(actor, parsed.data));
  } catch (error) {
    return mutationFailure(error);
  }
  revalidatePath("/family", "layout");
  redirect(`/family/members/${profileId}`);
}

export async function deleteManagedProfileAction(input: unknown): Promise<ProfileMutationResult> {
  try {
    const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
    const parsed = deleteManagedProfileSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);
    await deleteManagedProfile(actor, parsed.data);
  } catch (error) {
    return mutationFailure(error);
  }
  revalidatePath("/family", "layout");
  redirect("/family/members");
}
