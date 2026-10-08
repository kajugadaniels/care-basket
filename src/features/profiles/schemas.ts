import { z } from "zod";
import { DISPLAY_NAME_MAX_LENGTH } from "@/features/family/limits";
import { hasUnsafeCharacters } from "@/features/family/schemas";
import { profilesCopy } from "./copy";
import { PROFILE_AVATAR_KEYS, PROFILE_KINDS } from "./presets";

const displayNameSchema = z.string({ error: profilesCopy.errors.nameRequired })
  // Check before trimming so leading/trailing controls cannot disappear during normalization.
  .refine((value) => !hasUnsafeCharacters(value), profilesCopy.errors.nameUnsafe)
  .transform((value) => value.trim())
  .pipe(z.string().min(1, profilesCopy.errors.nameRequired)
    .max(DISPLAY_NAME_MAX_LENGTH, profilesCopy.errors.nameLength));
const avatarSchema = z.enum(PROFILE_AVATAR_KEYS, { error: profilesCopy.errors.avatar });

export const profileIdSchema = z.uuid();
export const createManagedProfileSchema = z.strictObject({
  displayName: displayNameSchema,
  kind: z.enum(PROFILE_KINDS, { error: profilesCopy.errors.kind }),
  avatarKey: avatarSchema,
  consent: z.literal(true, { error: profilesCopy.errors.consent }),
});
// Kind, locale, ownership, consent metadata, and AI permissions cannot be changed here.
export const updateManagedProfileSchema = z.strictObject({
  profileId: profileIdSchema,
  displayName: displayNameSchema,
  avatarKey: avatarSchema,
});
export const deleteManagedProfileSchema = z.strictObject({
  profileId: profileIdSchema,
  confirmed: z.literal(true, { error: profilesCopy.errors.confirmation }),
});
export const listManagedProfilesSchema = z.strictObject({ after: profileIdSchema.optional() });

export type CreateManagedProfileInput = z.infer<typeof createManagedProfileSchema>;
export type UpdateManagedProfileInput = z.infer<typeof updateManagedProfileSchema>;
export type DeleteManagedProfileInput = z.infer<typeof deleteManagedProfileSchema>;
export type ListManagedProfilesInput = z.infer<typeof listManagedProfilesSchema>;
