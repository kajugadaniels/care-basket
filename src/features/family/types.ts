import type { ActionError } from "@/types/action-result";

export type CreateFamilyFormValues = {
  familyName: string;
  displayName: string;
};

// State for useActionState: the submitted values are returned so the form keeps them
// after React resets it, together with any friendly error.
export type CreateFamilyFormState = {
  values: CreateFamilyFormValues;
  error: ActionError | null;
};

// What the family dashboard shows. Only the signed-in adult's own family.
export type FamilyOverview = {
  familyName: string;
  displayName: string;
  role: "OWNER" | "MANAGER";
};
