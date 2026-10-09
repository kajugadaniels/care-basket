import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { writeProfileEvent } from "@/server/audit/write-profile-event";
import { writeDeviceEvent } from "@/server/audit/write-device-event";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { PROFILE_PAGE_SIZE } from "../presets";
import type { CreateManagedProfileInput, UpdateManagedProfileInput } from "../schemas";

const profileSelect = {
  id: true, displayName: true, kind: true, avatarKey: true, createdAt: true,
} satisfies Prisma.ManagedProfileSelect;
export type ProfileRecord = Prisma.ManagedProfileGetPayload<{ select: typeof profileSelect }>;

type ProfileWriteContext = { familyId: string; userId: string };
type CreateProfileData = Omit<CreateManagedProfileInput, "consent"> & {
  locale: string;
  consentConfirmedAt: Date;
  consentVersion: string;
};

export async function insertProfile(context: ProfileWriteContext, input: CreateProfileData) {
  return getDb().$transaction(async (tx) => {
    const profile = await tx.managedProfile.create({
      data: {
        ...input,
        familyId: context.familyId,
        createdByUserId: context.userId,
        aiAssistEnabled: false,
        aiConsentConfirmedAt: null,
        aiConsentVersion: null,
      },
      select: profileSelect,
    });
    await writeProfileEvent(tx, {
      familyId: context.familyId, actorId: context.userId,
      profileId: profile.id, action: "profile.created",
    });
    return profile;
  });
}

export async function listProfiles(familyId: string, after?: string): Promise<ProfileRecord[]> {
  return getDb().managedProfile.findMany({
    where: { familyId, ...(after ? { id: { gt: after } } : {}) },
    select: profileSelect,
    orderBy: { id: "asc" },
    take: PROFILE_PAGE_SIZE,
  });
}

export async function findProfile(familyId: string, profileId: string): Promise<ProfileRecord | null> {
  return getDb().managedProfile.findFirst({
    where: { id: profileId, familyId }, select: profileSelect,
  });
}

export async function countProfiles(familyId: string): Promise<number> {
  return getDb().managedProfile.count({ where: { familyId } });
}

export async function hasProfilesAfter(familyId: string, profileId: string): Promise<boolean> {
  const next = await getDb().managedProfile.findFirst({
    where: { familyId, id: { gt: profileId } }, select: { id: true },
  });
  return next !== null;
}

export async function updateProfile(context: ProfileWriteContext, input: UpdateManagedProfileInput) {
  return getDb().$transaction(async (tx) => {
    const result = await tx.managedProfile.updateMany({
      where: { id: input.profileId, familyId: context.familyId },
      // An explicit allow-list preserves kind, consent, creation time, and AI permissions.
      data: { displayName: input.displayName, avatarKey: input.avatarKey },
    });
    if (result.count !== 1) throw new AppError("NOT_FOUND");
    await writeProfileEvent(tx, {
      familyId: context.familyId, actorId: context.userId,
      profileId: input.profileId, action: "profile.updated",
    });
  });
}

export async function removeProfile(context: ProfileWriteContext, profileId: string) {
  return getDb().$transaction(async (tx) => {
    const devices = await tx.authorizedDevice.findMany({
      where: { familyId: context.familyId, profileId, revokedAt: null }, select: { id: true },
    });
    const now = new Date();
    for (const device of devices) {
      const revoked = await tx.authorizedDevice.updateMany({
        where: { id: device.id, familyId: context.familyId, profileId, revokedAt: null },
        data: { revokedAt: now, revokedByUserId: context.userId },
      });
      if (revoked.count) await writeDeviceEvent(tx, { familyId: context.familyId,
        actorType: "ADULT", actorId: context.userId, action: "device.revoked",
        targetType: "AuthorizedDevice", targetId: device.id });
    }
    // Composite FKs cascade devices, pairings, requests, baskets and items in this transaction.
    const result = await tx.managedProfile.deleteMany({
      where: { id: profileId, familyId: context.familyId },
    });
    if (result.count !== 1) throw new AppError("NOT_FOUND");
    await writeProfileEvent(tx, {
      familyId: context.familyId, actorId: context.userId,
      profileId, action: "profile.deleted",
    });
  });
}
