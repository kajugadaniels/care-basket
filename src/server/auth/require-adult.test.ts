// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureUser: vi.fn(),
  findFamilyMembership: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/ensure-user", () => ({ ensureUser: mocks.ensureUser }));
vi.mock("@/server/auth/family-membership", () => ({
  findFamilyMembership: mocks.findFamilyMembership,
}));

import { AppError } from "@/server/errors";
import { requireAdult } from "./require-adult";

const user = { id: "user-1", clerkUserId: "user_clerk_1" };

function membership(role: "OWNER" | "MANAGER") {
  return { familyId: "family-1", familyName: "Jane's Family", role, displayName: "Jane" };
}

describe("requireAdult", () => {
  beforeEach(() => {
    mocks.ensureUser.mockReset();
    mocks.findFamilyMembership.mockReset();
    mocks.redirect.mockClear();
  });

  it("rejects visitors without a session", async () => {
    const redirectError = new Error("NEXT_REDIRECT:/sign-in");
    mocks.ensureUser.mockRejectedValue(redirectError);

    await expect(requireAdult()).rejects.toBe(redirectError);
    expect(mocks.findFamilyMembership).not.toHaveBeenCalled();
  });

  it("sends a signed-in adult without a family to setup", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.findFamilyMembership.mockResolvedValue(null);

    await expect(requireAdult()).rejects.toThrow("NEXT_REDIRECT:/family/setup");
    expect(mocks.redirect).toHaveBeenCalledWith("/family/setup");
  });

  it("resolves a family OWNER from the session and the database", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.findFamilyMembership.mockResolvedValue(membership("OWNER"));

    await expect(requireAdult()).resolves.toEqual({
      type: "adult",
      userId: "user-1",
      familyId: "family-1",
      role: "OWNER",
    });
    expect(mocks.findFamilyMembership).toHaveBeenCalledWith("user-1");
  });

  it("resolves a family MANAGER", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.findFamilyMembership.mockResolvedValue(membership("MANAGER"));

    await expect(requireAdult()).resolves.toMatchObject({ role: "MANAGER" });
  });

  it("rejects a role that the caller does not allow", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.findFamilyMembership.mockResolvedValue(membership("MANAGER"));

    const result = requireAdult({ roles: ["OWNER"] });

    await expect(result).rejects.toBeInstanceOf(AppError);
    await expect(result).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("ignores any family ID the caller might pass and uses the session's membership", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.findFamilyMembership.mockResolvedValue(membership("OWNER"));

    // @ts-expect-error requireAdult accepts no ownership input; a forged ID must have no effect.
    const actor = await requireAdult({ familyId: "someone-elses-family" });

    expect(actor.familyId).toBe("family-1");
  });
});
