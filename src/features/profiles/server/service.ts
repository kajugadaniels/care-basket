import "server-only";
import type { AdultActor } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import { PROFILE_AVATAR_KEYS, PROFILE_CONSENT_VERSION, PROFILE_LOCALE, PROFILE_PAGE_SIZE } from "../presets";
import {
  createManagedProfileSchema, deleteManagedProfileSchema, listManagedProfilesSchema,
  profileIdSchema, updateManagedProfileSchema,
  type CreateManagedProfileInput, type DeleteManagedProfileInput,
  type ListManagedProfilesInput, type UpdateManagedProfileInput,
} from "../schemas";
import type { ManagedProfileDto, ProfileAvatarKey, ProfileListDto } from "../types";
import { countProfiles, findProfile, hasProfilesAfter, insertProfile, listProfiles, removeProfile, updateProfile,
  type ProfileRecord } from "./repository";

function assertManager(actor: AdultActor) {
  if (!actor) throw new AppError("UNAUTHENTICATED");
  if (actor.type !== "adult" || !["OWNER", "MANAGER"].includes(actor.role)) {
    throw new AppError("FORBIDDEN");
  }
}

function toDto(profile: ProfileRecord): ManagedProfileDto {
  // Handle an obsolete stored preset gracefully, while new input accepts only current presets.
  const avatarKey = PROFILE_AVATAR_KEYS.includes(profile.avatarKey as ProfileAvatarKey)
    ? profile.avatarKey as ProfileAvatarKey : "smile";
  return {
    id: profile.id, displayName: profile.displayName, kind: profile.kind,
    avatarKey, createdAt: profile.createdAt.toISOString(),
  };
}

export async function createManagedProfile(actor: AdultActor, input: CreateManagedProfileInput) {
  assertManager(actor);
  const parsed = createManagedProfileSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_FAILED");
  const profile = await insertProfile(actor, {
    displayName: parsed.data.displayName, kind: parsed.data.kind,
    avatarKey: parsed.data.avatarKey, locale: PROFILE_LOCALE,
    consentConfirmedAt: new Date(), consentVersion: PROFILE_CONSENT_VERSION,
  });
  return { profileId: profile.id };
}

export async function listManagedProfiles(
  actor: AdultActor, input: ListManagedProfilesInput = {},
): Promise<ProfileListDto> {
  assertManager(actor);
  const parsed = listManagedProfilesSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_FAILED");
  const profiles = await listProfiles(actor.familyId, parsed.data.after);
  const last = profiles.at(-1);
  const hasMore = profiles.length === PROFILE_PAGE_SIZE && last
    ? await hasProfilesAfter(actor.familyId, last.id) : false;
  return {
    profiles: profiles.map(toDto),
    nextCursor: hasMore && last ? last.id : null,
  };
}

export async function getManagedProfile(actor: AdultActor, profileId: string): Promise<ManagedProfileDto> {
  assertManager(actor);
  if (!profileIdSchema.safeParse(profileId).success) throw new AppError("NOT_FOUND");
  const profile = await findProfile(actor.familyId, profileId);
  if (!profile) throw new AppError("NOT_FOUND");
  return toDto(profile);
}

export async function updateManagedProfile(actor: AdultActor, input: UpdateManagedProfileInput) {
  assertManager(actor);
  const parsed = updateManagedProfileSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_FAILED");
  await updateProfile(actor, parsed.data);
  return { profileId: parsed.data.profileId };
}

export async function deleteManagedProfile(actor: AdultActor, input: DeleteManagedProfileInput) {
  assertManager(actor);
  const parsed = deleteManagedProfileSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_FAILED");
  await removeProfile(actor, parsed.data.profileId);
  return { profileId: parsed.data.profileId };
}

export async function countManagedProfiles(actor: AdultActor): Promise<number> {
  assertManager(actor);
  return countProfiles(actor.familyId);
}
