// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = {
  id: string; familyId: string; displayName: string; kind: "CHILD" | "ASSISTED_ADULT";
  avatarKey: string; createdAt: Date; createdByUserId: string; consentVersion: string;
  consentConfirmedAt: Date; locale: string; aiAssistEnabled: boolean;
  aiConsentConfirmedAt: Date | null; aiConsentVersion: string | null;
};
type Query = { where: { familyId: string; id?: string | { gt: string } }; select?: object; take?: number; orderBy?: object };
type Write = { table: string; data: Record<string, unknown> };

const fake = vi.hoisted(() => {
  const rows: Row[] = [];
  const devices: { id: string; familyId: string; profileId: string; revokedAt: Date | null }[] = [];
  const committed: Write[] = [];
  const calls: { method: string; input: unknown }[] = [];
  const failures = { audit: false };
  function matches(row: Row, where: Query["where"]) {
    return row.familyId === where.familyId && (!where.id || (typeof where.id === "string"
      ? row.id === where.id : row.id > where.id.gt));
  }
  function selected(row: Row) {
    return { id: row.id, displayName: row.displayName, kind: row.kind, avatarKey: row.avatarKey, createdAt: row.createdAt };
  }
  function delegate(staged: Row[], writes: Write[]) {
    return {
      create: async (input: { data: Omit<Row, "id" | "createdAt">; select: object }) => {
        calls.push({ method: "create", input });
        const row = { ...input.data, id: "019a1234-0000-7000-8000-000000000003", createdAt: new Date("2026-10-08T12:00:00Z") };
        staged.push(row);
        writes.push({ table: "profile", data: row });
        return selected(row);
      },
      findFirst: async (input: Query) => {
        calls.push({ method: "findFirst", input });
        const row = staged.find((record) => matches(record, input.where));
        return row ? selected(row) : null;
      },
      findMany: async (input: Query) => {
        calls.push({ method: "findMany", input });
        return staged.filter((row) => matches(row, input.where))
          .sort((a, b) => a.id.localeCompare(b.id)).slice(0, input.take).map(selected);
      },
      count: async (input: Query) => {
        calls.push({ method: "count", input });
        return staged.filter((row) => matches(row, input.where)).length;
      },
      updateMany: async (input: Query & { data: Record<string, unknown> }) => {
        calls.push({ method: "updateMany", input });
        let count = 0;
        for (const row of staged) {
          if (matches(row, input.where)) { Object.assign(row, input.data); count++; }
        }
        writes.push({ table: "profile", data: input.data });
        return { count };
      },
      deleteMany: async (input: Query) => {
        calls.push({ method: "deleteMany", input });
        const before = staged.length;
        const remaining = staged.filter((row) => !matches(row, input.where));
        staged.splice(0, staged.length, ...remaining);
        writes.push({ table: "delete", data: input.where });
        return { count: before - remaining.length };
      },
    };
  }
  const db = {
    managedProfile: delegate(rows, committed),
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const staged = rows.map((row) => ({ ...row }));
      const stagedDevices = devices.map((row) => ({ ...row }));
      const writes: Write[] = [];
      const result = await callback({
        managedProfile: delegate(staged, writes),
        authorizedDevice: {
          findMany: async ({ where }: { where: { familyId: string; profileId: string } }) => stagedDevices.filter((d) =>
            d.familyId === where.familyId && d.profileId === where.profileId && d.revokedAt === null),
          updateMany: async ({ where, data }: { where: { id: string; familyId: string; profileId: string }; data: { revokedAt: Date } }) => {
            const device = stagedDevices.find((d) => d.id === where.id && d.familyId === where.familyId && d.profileId === where.profileId && !d.revokedAt);
            if (device) { device.revokedAt = data.revokedAt; writes.push({ table: "device", data: { ...where, ...data } }); }
            return { count: device ? 1 : 0 };
          },
        },
        auditLog: { create: async (input: { data: Record<string, unknown> }) => {
          if (failures.audit) throw new Error("audit unavailable");
          writes.push({ table: "audit", data: input.data });
          return { id: "audit-1" };
        } },
      });
      rows.splice(0, rows.length, ...staged);
      devices.splice(0, devices.length, ...stagedDevices.filter((d) => staged.some((p) => p.id === d.profileId)));
      committed.push(...writes);
      return result;
    }),
  };
  return { db, rows, devices, committed, calls, failures };
});
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => fake.db }));

import { insertProfile, listProfiles, findProfile, countProfiles, hasProfilesAfter, updateProfile, removeProfile } from "./repository";

const context = { familyId: "019a1234-0000-7000-8000-000000000002", userId: "019a1234-0000-7000-8000-000000000001" };
const profileId = "019a1234-0000-7000-8000-000000000003";
const date = new Date("2026-10-08T12:00:00Z");
const input = { displayName: "Rose", kind: "CHILD", avatarKey: "flower", locale: "en-US",
  consentVersion: "2026-10-08", consentConfirmedAt: date } as const;
const own: Row = { ...input, id: profileId, familyId: context.familyId, createdByUserId: context.userId,
  createdAt: date, aiAssistEnabled: false, aiConsentConfirmedAt: null, aiConsentVersion: null };
const other: Row = { ...own, id: "019a1234-0000-7000-8000-000000000004", familyId: "other-family", displayName: "Sam" };

describe("managed profile repository", () => {
  beforeEach(() => {
    fake.rows.splice(0, fake.rows.length);
    fake.devices.splice(0, fake.devices.length);
    fake.committed.splice(0, fake.committed.length);
    fake.calls.splice(0, fake.calls.length);
    fake.failures.audit = false;
    fake.db.$transaction.mockClear();
  });
  it("creates a profile with consent, no AI permission, and an atomic audit entry", async () => {
    await insertProfile(context, input);
    expect(fake.rows[0]).toMatchObject({ ...input, familyId: context.familyId, createdByUserId: context.userId,
      aiAssistEnabled: false, aiConsentConfirmedAt: null, aiConsentVersion: null });
    expect(fake.committed.find((write) => write.table === "audit")?.data).toEqual({
      familyId: context.familyId, actorType: "ADULT", actorId: context.userId,
      action: "profile.created", targetType: "ManagedProfile", targetId: profileId,
    });
    expect(JSON.stringify(fake.committed.filter((write) => write.table === "audit"))).not.toContain("Rose");
  });
  it("lists and counts only profiles in the supplied family", async () => {
    fake.rows.push({ ...own }, { ...other });
    expect(await listProfiles(context.familyId)).toEqual([{
      id: own.id, displayName: own.displayName, kind: own.kind, avatarKey: own.avatarKey, createdAt: own.createdAt,
    }]);
    expect(await countProfiles(context.familyId)).toBe(1);
    expect(fake.calls.find((call) => call.method === "findMany")?.input).toMatchObject({ where: { familyId: context.familyId }, take: 50 });
  });
  it("scopes continuation to the family and uses stable ID ordering", async () => {
    fake.rows.push({ ...own }, { ...other });
    expect(await listProfiles(context.familyId, profileId)).toEqual([]);
    expect(fake.calls[0].input).toMatchObject({ where: { familyId: context.familyId, id: { gt: profileId } }, orderBy: { id: "asc" } });
  });
  it("does not count another family's profile as a continuation", async () => {
    fake.rows.push({ ...own }, { ...other });
    expect(await hasProfilesAfter(context.familyId, profileId)).toBe(false);
    expect(fake.calls[0].input).toEqual({ where: { familyId: context.familyId, id: { gt: profileId } }, select: { id: true } });
  });
  it("fetches only an owned profile and selects display fields", async () => {
    fake.rows.push({ ...own }, { ...other });
    const profile = await findProfile(context.familyId, profileId);
    expect(profile).not.toHaveProperty("familyId");
    expect(profile).not.toHaveProperty("consentConfirmedAt");
    expect(await findProfile(context.familyId, other.id)).toBeNull();
    expect(fake.calls[0].input).toMatchObject({ where: { familyId: context.familyId, id: profileId }, select: {
      id: true, displayName: true, kind: true, avatarKey: true, createdAt: true,
    } });
  });
  it("updates only name and avatar without resetting kind, consent, or creation metadata", async () => {
    fake.rows.push({ ...own });
    await updateProfile(context, { profileId, displayName: "Rosie", avatarKey: "sun" });
    expect(fake.rows[0]).toEqual({ ...own, displayName: "Rosie", avatarKey: "sun" });
    expect(fake.calls[0]).toMatchObject({ method: "updateMany", input: {
      where: { id: profileId, familyId: context.familyId }, data: { displayName: "Rosie", avatarKey: "sun" },
    } });
    expect(fake.committed.at(-1)?.data.action).toBe("profile.updated");
  });
  it("preserves existing AI consent metadata during editing", async () => {
    const consented: Row = { ...own, kind: "ASSISTED_ADULT", aiAssistEnabled: true,
      aiConsentConfirmedAt: date, aiConsentVersion: "later-version" };
    fake.rows.push({ ...consented });
    await updateProfile(context, { profileId, displayName: "Rosie", avatarKey: "sun" });
    expect(fake.rows[0]).toEqual({ ...consented, displayName: "Rosie", avatarKey: "sun" });
  });
  it.each(["update", "delete"])("returns NOT_FOUND and changes nothing for a cross-family %s", async (operation) => {
    fake.rows.push({ ...other });
    const result = operation === "update"
      ? updateProfile(context, { profileId: other.id, displayName: "Rosie", avatarKey: "sun" })
      : removeProfile(context, other.id);
    await expect(result).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fake.rows).toEqual([other]);
    expect(fake.committed).toEqual([]);
  });
  it("hard-deletes only the family-owned profile and records an audit event", async () => {
    fake.rows.push({ ...own }, { ...other });
    await removeProfile(context, profileId);
    expect(fake.rows).toEqual([other]);
    expect(fake.committed.at(-1)?.data.action).toBe("profile.deleted");
  });
  it("revokes and cascades owned devices atomically before deleting the profile", async () => {
    fake.rows.push({ ...own }, { ...other });
    fake.devices.push({ id: "device-owned", familyId: context.familyId, profileId, revokedAt: null },
      { id: "device-other", familyId: other.familyId, profileId: other.id, revokedAt: null });
    await removeProfile(context, profileId);
    expect(fake.devices.map((d) => d.id)).toEqual(["device-other"]);
    expect(fake.committed.filter((w) => w.table === "audit").map((w) => w.data.action)).toEqual(["device.revoked", "profile.deleted"]);
  });
  it("rolls back device invalidation together with deletion if auditing fails", async () => {
    fake.rows.push({ ...own });
    fake.devices.push({ id: "device-owned", familyId: context.familyId, profileId, revokedAt: null });
    fake.failures.audit = true;
    await expect(removeProfile(context, profileId)).rejects.toThrow("audit unavailable");
    expect(fake.devices[0].revokedAt).toBeNull(); expect(fake.rows).toEqual([own]); expect(fake.committed).toEqual([]);
  });
  it.each(["create", "update", "delete"])("rolls back %s when its audit entry fails", async (operation) => {
    fake.rows.push({ ...own });
    fake.failures.audit = true;
    const result = operation === "create" ? insertProfile(context, input)
      : operation === "update" ? updateProfile(context, { profileId, displayName: "Rosie", avatarKey: "sun" })
        : removeProfile(context, profileId);
    await expect(result).rejects.toThrow("audit unavailable");
    expect(fake.rows).toEqual([own]);
    expect(fake.committed).toEqual([]);
  });
});
