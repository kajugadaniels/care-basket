// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdultActor } from "@/server/auth/require-adult";

const mocks = vi.hoisted(() => ({
  insertProfile: vi.fn(), listProfiles: vi.fn(), findProfile: vi.fn(),
  updateProfile: vi.fn(), removeProfile: vi.fn(), countProfiles: vi.fn(),
  hasProfilesAfter: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("./repository", () => mocks);

import { createManagedProfile, listManagedProfiles, getManagedProfile,
  updateManagedProfile, deleteManagedProfile, countManagedProfiles } from "./service";

const actor: AdultActor = { type: "adult", userId: "019a1234-0000-7000-8000-000000000001",
  familyId: "019a1234-0000-7000-8000-000000000002", role: "OWNER" };
const profileId = "019a1234-0000-7000-8000-000000000003";
const now = new Date("2026-10-08T12:00:00Z");
const record = { id: profileId, displayName: "Rose", kind: "CHILD", avatarKey: "flower", createdAt: now };
const input = { displayName: "Rose", kind: "CHILD", avatarKey: "flower", consent: true } as const;

describe("managed profile service", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mocks.insertProfile.mockResolvedValue(record);
    mocks.findProfile.mockResolvedValue(record);
    mocks.listProfiles.mockResolvedValue([record]);
    mocks.countProfiles.mockResolvedValue(2);
    mocks.hasProfilesAfter.mockResolvedValue(true);
  });
  afterEach(() => vi.useRealTimers());

  it.each(["OWNER", "MANAGER"] as const)("creates a profile as %s with server-derived ownership and consent", async (role) => {
    const manager = { ...actor, role };
    await expect(createManagedProfile(manager, input)).resolves.toEqual({ profileId });
    expect(mocks.insertProfile).toHaveBeenCalledWith(manager, {
      displayName: "Rose", kind: "CHILD", avatarKey: "flower", locale: "en-US",
      consentConfirmedAt: now, consentVersion: "2026-10-08",
    });
  });
  it("never creates a profile without explicit consent", async () => {
    // @ts-expect-error untrusted callers can send false even though the validated type cannot.
    await expect(createManagedProfile(actor, { ...input, consent: false })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(mocks.insertProfile).not.toHaveBeenCalled();
  });
  it("returns only serializable display fields for the current family", async () => {
    await expect(listManagedProfiles(actor)).resolves.toEqual({
      profiles: [{ ...record, createdAt: now.toISOString() }], nextCursor: null,
    });
    expect(mocks.listProfiles).toHaveBeenCalledWith(actor.familyId, undefined);
  });
  it("supports family-scoped continuation beyond 50 profiles", async () => {
    mocks.listProfiles.mockResolvedValue(Array.from({ length: 50 }, () => record));
    const result = await listManagedProfiles(actor, { after: profileId });
    expect(mocks.listProfiles).toHaveBeenCalledWith(actor.familyId, profileId);
    expect(result.nextCursor).toBe(profileId);
  });
  it("does not offer an empty continuation after exactly 50 profiles", async () => {
    mocks.listProfiles.mockResolvedValue(Array.from({ length: 50 }, () => record));
    mocks.hasProfilesAfter.mockResolvedValue(false);
    expect((await listManagedProfiles(actor)).nextCursor).toBeNull();
    expect(mocks.hasProfilesAfter).toHaveBeenCalledWith(actor.familyId, profileId);
  });
  it("fetches by both family and profile ID", async () => {
    await getManagedProfile(actor, profileId);
    expect(mocks.findProfile).toHaveBeenCalledWith(actor.familyId, profileId);
  });
  it("returns NOT_FOUND for another family's profile", async () => {
    mocks.findProfile.mockResolvedValue(null);
    await expect(getManagedProfile(actor, profileId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("returns NOT_FOUND for an invalid lookup without querying", async () => {
    await expect(getManagedProfile(actor, "bad")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.findProfile).not.toHaveBeenCalled();
  });
  it("updates the actor's family profile", async () => {
    const update = { profileId, displayName: "Rose", avatarKey: "sun" } as const;
    await updateManagedProfile(actor, update);
    expect(mocks.updateProfile).toHaveBeenCalledWith(actor, update);
  });
  it("rejects an attempt to promote a child through ordinary editing", async () => {
    await expect(updateManagedProfile(actor, {
      profileId, displayName: "Rose", avatarKey: "sun",
      // @ts-expect-error ordinary edits intentionally exclude profile kind.
      kind: "ASSISTED_ADULT",
    })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });
  it.each(["update", "delete"])("preserves NOT_FOUND for a cross-family %s", async (operation) => {
    const error = Object.assign(new Error(), { code: "NOT_FOUND" });
    mocks.updateProfile.mockRejectedValue(error);
    mocks.removeProfile.mockRejectedValue(error);
    const result = operation === "update"
      ? updateManagedProfile(actor, { profileId, displayName: "Rose", avatarKey: "sun" })
      : deleteManagedProfile(actor, { profileId, confirmed: true });
    await expect(result).rejects.toBe(error);
  });
  it("requires confirmation and deletes only the actor's family profile", async () => {
    await deleteManagedProfile(actor, { profileId, confirmed: true });
    expect(mocks.removeProfile).toHaveBeenCalledWith(actor, profileId);
    mocks.removeProfile.mockClear();
    // @ts-expect-error a forged input must not bypass the server's confirmation check.
    await expect(deleteManagedProfile(actor, { profileId, confirmed: false })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(mocks.removeProfile).not.toHaveBeenCalled();
  });
  it("counts real profiles for the current family", async () => {
    await expect(countManagedProfiles(actor)).resolves.toBe(2);
    expect(mocks.countProfiles).toHaveBeenCalledWith(actor.familyId);
  });
  const operations = [
    (a: AdultActor) => createManagedProfile(a, input),
    (a: AdultActor) => listManagedProfiles(a),
    (a: AdultActor) => getManagedProfile(a, profileId),
    (a: AdultActor) => updateManagedProfile(a, { profileId, displayName: "Rose", avatarKey: "sun" }),
    (a: AdultActor) => deleteManagedProfile(a, { profileId, confirmed: true }),
    (a: AdultActor) => countManagedProfiles(a),
  ];
  it.each(operations)("denies a device or unsupported role before accessing data", async (operation) => {
    // @ts-expect-error device actors cannot call manager-only services.
    await expect(operation({ ...actor, type: "device" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    // @ts-expect-error unsupported roles must be denied at runtime too.
    await expect(operation({ ...actor, role: "VIEWER" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    for (const mock of Object.values(mocks)) expect(mock).not.toHaveBeenCalled();
  });
  it.each(operations)("rejects a missing actor before accessing data", async (operation) => {
    // @ts-expect-error unauthenticated calls must not read or change profiles.
    await expect(operation(null)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    for (const mock of Object.values(mocks)) expect(mock).not.toHaveBeenCalled();
  });
});
