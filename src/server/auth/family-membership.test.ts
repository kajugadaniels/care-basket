// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  familyMembership: { findUnique: vi.fn() },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => db }));

import { readFamilyMembership } from "./family-membership";

describe("readFamilyMembership", () => {
  beforeEach(() => {
    db.familyMembership.findUnique.mockReset();
  });

  it("returns null for a user who has not set up a family", async () => {
    db.familyMembership.findUnique.mockResolvedValue(null);

    await expect(readFamilyMembership("user-1")).resolves.toBeNull();
  });

  it("looks up the membership by the given user ID only", async () => {
    db.familyMembership.findUnique.mockResolvedValue(null);

    await readFamilyMembership("user-1");

    expect(db.familyMembership.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });

  it("returns the family and the adult's role and display name", async () => {
    db.familyMembership.findUnique.mockResolvedValue({
      role: "OWNER",
      displayName: "Jane",
      family: { id: "family-1", name: "Jane's Family" },
    });

    await expect(readFamilyMembership("user-1")).resolves.toEqual({
      familyId: "family-1",
      familyName: "Jane's Family",
      role: "OWNER",
      displayName: "Jane",
    });
  });
});
