import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureUser: vi.fn(),
  findFamilyMembership: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  createFamilyAction: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/ensure-user", () => ({ ensureUser: mocks.ensureUser }));
vi.mock("@/server/auth/family-membership", () => ({
  findFamilyMembership: mocks.findFamilyMembership,
}));
vi.mock("@/server/auth/require-authenticated-user", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));
vi.mock("@/features/family/actions", () => ({ createFamilyAction: mocks.createFamilyAction }));

import FamilySetupPage from "./page";

const user = { id: "user-1", clerkUserId: "user_clerk_1" };

describe("FamilySetupPage", () => {
  beforeEach(() => {
    mocks.ensureUser.mockReset();
    mocks.findFamilyMembership.mockReset();
    mocks.requireAuthenticatedUser.mockReset();
    mocks.redirect.mockClear();
  });

  it("requires a signed-in session", async () => {
    const redirectError = new Error("NEXT_REDIRECT:/sign-in");
    mocks.ensureUser.mockRejectedValue(redirectError);

    await expect(FamilySetupPage()).rejects.toBe(redirectError);
    expect(mocks.findFamilyMembership).not.toHaveBeenCalled();
  });

  it("sends an adult who already has a family to the dashboard", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.findFamilyMembership.mockResolvedValue({
      familyId: "family-1",
      familyName: "Jane's Family",
      role: "OWNER",
      displayName: "Jane",
    });

    await expect(FamilySetupPage()).rejects.toThrow("NEXT_REDIRECT:/family");
    expect(mocks.findFamilyMembership).toHaveBeenCalledWith("user-1");
  });

  it("shows the setup form to an adult without a family", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.findFamilyMembership.mockResolvedValue(null);
    mocks.requireAuthenticatedUser.mockResolvedValue({ clerkUserId: "user_clerk_1", firstName: "Jane" });

    render(await FamilySetupPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Let's set up your family" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Give your family a name so you can start helping the people you care about."),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Family name" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Your display name" })).toHaveValue("Jane");
    expect(screen.getByRole("button", { name: "Create My Family" })).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("leaves the display name empty when the account has no first name", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.findFamilyMembership.mockResolvedValue(null);
    mocks.requireAuthenticatedUser.mockResolvedValue({ clerkUserId: "user_clerk_1", firstName: null });

    render(await FamilySetupPage());

    expect(screen.getByRole("textbox", { name: "Your display name" })).toHaveValue("");
  });
});
