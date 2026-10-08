import { describe, expect, it } from "vitest";
import { createManagedProfileSchema, deleteManagedProfileSchema, updateManagedProfileSchema } from "./schemas";

const profileId = "019a1234-0000-7000-8000-000000000001";
const valid = { displayName: "Grandma Rose", kind: "ASSISTED_ADULT", avatarKey: "flower", consent: true };

describe("managed profile schemas", () => {
  it.each(["ASSISTED_ADULT", "CHILD"])("accepts a consented %s profile", (kind) => {
    expect(createManagedProfileSchema.safeParse({ ...valid, kind }).success).toBe(true);
  });
  it("trims names and accepts the 40-character boundary", () => {
    expect(createManagedProfileSchema.parse({ ...valid, displayName: "  Rose  " }).displayName).toBe("Rose");
    expect(createManagedProfileSchema.safeParse({ ...valid, displayName: "R".repeat(40) }).success).toBe(true);
  });
  it.each(["", "  ", "R".repeat(41), "Rose\u0000", "\tRose", "Rose\n", "Ro\u202ese", "Ro\u200bse"])(
    "rejects empty, excessive, or unsafe names (%j)", (displayName) => {
      expect(createManagedProfileSchema.safeParse({ ...valid, displayName }).success).toBe(false);
    },
  );
  it("rejects unsupported profile types and unknown avatars", () => {
    expect(createManagedProfileSchema.safeParse({ ...valid, kind: "OWNER" }).success).toBe(false);
    expect(createManagedProfileSchema.safeParse({ ...valid, avatarKey: "photo" }).success).toBe(false);
  });
  it.each([undefined, false, "true", "on", 1])("requires explicit boolean consent (%j)", (consent) => {
    expect(createManagedProfileSchema.safeParse({ ...valid, consent }).success).toBe(false);
  });
  it.each(["familyId", "createdByUserId", "aiAssistEnabled", "locale", "email"])("rejects unexpected %s", (key) => {
    expect(createManagedProfileSchema.safeParse({ ...valid, [key]: "forged" }).success).toBe(false);
  });
  it("allows edits only to name and preset avatar", () => {
    const input = { profileId, displayName: "Rose", avatarKey: "sun" };
    expect(updateManagedProfileSchema.safeParse(input).success).toBe(true);
    for (const key of ["kind", "familyId", "createdAt", "consentVersion", "aiAssistEnabled"]) {
      expect(updateManagedProfileSchema.safeParse({ ...input, [key]: "forged" }).success).toBe(false);
    }
  });
  it("validates profile lookup IDs", () => {
    expect(updateManagedProfileSchema.safeParse({ profileId: "bad", displayName: "Rose", avatarKey: "sun" }).success).toBe(false);
  });
  it("requires a separate deletion confirmation", () => {
    expect(deleteManagedProfileSchema.safeParse({ profileId, confirmed: true }).success).toBe(true);
    expect(deleteManagedProfileSchema.safeParse({ profileId, confirmed: false }).success).toBe(false);
    expect(deleteManagedProfileSchema.safeParse({ profileId }).success).toBe(false);
  });
});
