// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFamilyMembership: vi.fn(),
  readFamilyMembership: vi.fn(),
  createFamilyWithOwner: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/family-membership", () => ({
  findFamilyMembership: mocks.findFamilyMembership,
  readFamilyMembership: mocks.readFamilyMembership,
}));
vi.mock("./repository", () => ({ createFamilyWithOwner: mocks.createFamilyWithOwner }));

import type { AdultActor } from "@/server/auth/require-adult";
import { createFamilyForUser, getFamilyOverview } from "./service";

const input = { familyName: "Jane's Family", displayName: "Jane" };
const janesFamily = {
  familyId: "family-1",
  familyName: "Jane's Family",
  role: "OWNER" as const,
  displayName: "Jane",
};

function uniqueViolation() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

describe("createFamilyForUser", () => {
  beforeEach(() => {
    mocks.findFamilyMembership.mockReset();
    mocks.readFamilyMembership.mockReset();
    mocks.createFamilyWithOwner.mockReset();
  });

  it("creates a family with the user as OWNER", async () => {
    mocks.findFamilyMembership.mockResolvedValue(null);
    mocks.createFamilyWithOwner.mockResolvedValue(janesFamily);

    await expect(createFamilyForUser("user-1", input)).resolves.toEqual({
      status: "created",
      family: janesFamily,
    });
    expect(mocks.createFamilyWithOwner).toHaveBeenCalledWith({ userId: "user-1", ...input });
  });

  it("returns an existing family unchanged instead of creating or renaming one", async () => {
    mocks.findFamilyMembership.mockResolvedValue(janesFamily);

    const outcome = await createFamilyForUser("user-1", {
      familyName: "A Different Name",
      displayName: "Someone Else",
    });

    expect(outcome).toEqual({ status: "existing", family: janesFamily });
    expect(mocks.createFamilyWithOwner).not.toHaveBeenCalled();
  });

  it("resolves a concurrent submission to the family that won the race", async () => {
    mocks.findFamilyMembership.mockResolvedValue(null);
    mocks.createFamilyWithOwner.mockRejectedValue(uniqueViolation());
    mocks.readFamilyMembership.mockResolvedValue(janesFamily);

    await expect(createFamilyForUser("user-1", input)).resolves.toEqual({
      status: "existing",
      family: janesFamily,
    });
    expect(mocks.readFamilyMembership).toHaveBeenCalledWith("user-1");
  });

  it("rethrows a unique violation when no winning family can be found", async () => {
    const duplicate = uniqueViolation();
    mocks.findFamilyMembership.mockResolvedValue(null);
    mocks.createFamilyWithOwner.mockRejectedValue(duplicate);
    mocks.readFamilyMembership.mockResolvedValue(null);

    await expect(createFamilyForUser("user-1", input)).rejects.toBe(duplicate);
  });

  it("lets other failures propagate", async () => {
    const failure = new Error("connection lost");
    mocks.findFamilyMembership.mockResolvedValue(null);
    mocks.createFamilyWithOwner.mockRejectedValue(failure);

    await expect(createFamilyForUser("user-1", input)).rejects.toBe(failure);
    expect(mocks.readFamilyMembership).not.toHaveBeenCalled();
  });
});

describe("getFamilyOverview", () => {
  const actor: AdultActor = { type: "adult", userId: "user-1", familyId: "family-1", role: "OWNER" };

  beforeEach(() => {
    mocks.findFamilyMembership.mockReset();
  });

  it("returns the actor's own family name, display name, and role", async () => {
    mocks.findFamilyMembership.mockResolvedValue(janesFamily);

    await expect(getFamilyOverview(actor)).resolves.toEqual({
      familyName: "Jane's Family",
      displayName: "Jane",
      role: "OWNER",
    });
    expect(mocks.findFamilyMembership).toHaveBeenCalledWith("user-1");
  });

  it("refuses to return a family other than the actor's", async () => {
    mocks.findFamilyMembership.mockResolvedValue({ ...janesFamily, familyId: "family-2" });

    await expect(getFamilyOverview(actor)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("reports not found when the membership no longer exists", async () => {
    mocks.findFamilyMembership.mockResolvedValue(null);

    await expect(getFamilyOverview(actor)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
