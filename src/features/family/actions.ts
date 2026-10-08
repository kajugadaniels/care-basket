"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createFamilySchema } from "@/features/family/schemas";
import { createFamilyForUser } from "@/features/family/server/service";
import type { CreateFamilyFormState } from "@/features/family/types";
import { ensureUser } from "@/server/auth/ensure-user";

// Generous cap for values echoed back to the form; validation enforces the real limits.
const MAX_ECHOED_LENGTH = 200;

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.slice(0, MAX_ECHOED_LENGTH) : "";
}

/**
 * Creates the signed-in adult's family with them as OWNER, then opens the dashboard.
 * Only the two names are read from the form; user, family, and role come from the server.
 * Repeated or concurrent submissions resolve to the same family (see createFamilyForUser).
 */
export async function createFamilyAction(
  _previousState: CreateFamilyFormState,
  formData: FormData,
): Promise<CreateFamilyFormState> {
  // Authenticates on every call; redirects to sign-in when there is no session.
  const user = await ensureUser();

  const values = {
    familyName: readText(formData, "familyName"),
    displayName: readText(formData, "displayName"),
  };

  const parsed = createFamilySchema.safeParse(values);
  if (!parsed.success) {
    return {
      values,
      error: {
        code: "VALIDATION_FAILED",
        message: "Please check the highlighted fields.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      },
    };
  }

  try {
    await createFamilyForUser(user.id, parsed.data);
  } catch (error) {
    // Log the failure type only: never connection strings, names, or query details.
    console.error("family.create_failed", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return {
      values,
      error: {
        code: "INTERNAL",
        message: "We couldn't create your family. Please try again in a moment.",
      },
    };
  }

  // Outside the try block: redirect() works by throwing.
  revalidatePath("/family", "layout");
  redirect("/family");
}
