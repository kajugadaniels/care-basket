import "server-only";
import type { Prisma } from "@/generated/prisma/client";

type ProfileEvent = {
  familyId: string;
  actorId: string;
  profileId: string;
  action: "profile.created" | "profile.updated" | "profile.deleted";
};

// The caller's transaction couples the mutation and audit entry: either both persist or neither.
// Names, consent text, and any other personal text never enter this record.
export async function writeProfileEvent(tx: Prisma.TransactionClient, event: ProfileEvent) {
  await tx.auditLog.create({
    data: {
      familyId: event.familyId,
      actorType: "ADULT",
      actorId: event.actorId,
      action: event.action,
      targetType: "ManagedProfile",
      targetId: event.profileId,
    },
    select: { id: true },
  });
}
