import type { ActionResult } from "@/types/action-result";
import type { PROFILE_AVATAR_KEYS, PROFILE_KINDS } from "./presets";

export type ProfileAvatarKey = (typeof PROFILE_AVATAR_KEYS)[number];
export type ProfileKind = (typeof PROFILE_KINDS)[number];
export type ManagedProfileDto = {
  id: string;
  displayName: string;
  kind: ProfileKind;
  avatarKey: ProfileAvatarKey;
  createdAt: string;
};
export type ProfileListDto = { profiles: ManagedProfileDto[]; nextCursor: string | null };
export type ProfileMutationResult = ActionResult<{ profileId: string }>;
