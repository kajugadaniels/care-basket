import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdult: vi.fn(),
  getFamilyOverview: vi.fn(),
  countManagedProfiles: vi.fn(),
}));

vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.requireAdult }));
vi.mock("@/features/family/server/service", () => ({
  getFamilyOverview: mocks.getFamilyOverview,
}));
vi.mock("@/features/profiles/server/service", () => ({ countManagedProfiles: mocks.countManagedProfiles }));

import FamilyPage from "./page";

const actor = { type: "adult", userId: "user-1", familyId: "family-1", role: "OWNER" };

describe("FamilyPage", () => {
  beforeEach(() => {
    mocks.requireAdult.mockReset();
    mocks.getFamilyOverview.mockReset();
    mocks.countManagedProfiles.mockReset();
    mocks.countManagedProfiles.mockResolvedValue(0);
  });

  it("requires a signed-in adult with a family before loading anything", async () => {
    const redirectError = new Error("NEXT_REDIRECT:/family/setup");
    mocks.requireAdult.mockRejectedValue(redirectError);

    await expect(FamilyPage()).rejects.toBe(redirectError);
    expect(mocks.getFamilyOverview).not.toHaveBeenCalled();
  });

  it("loads the overview for the session's own family", async () => {
    mocks.requireAdult.mockResolvedValue(actor);
    mocks.getFamilyOverview.mockResolvedValue({
      familyName: "Jane's Family",
      displayName: "Jane",
      role: "OWNER",
    });

    render(await FamilyPage());

    expect(mocks.getFamilyOverview).toHaveBeenCalledWith(actor);
  });

  it("greets the adult by display name and shows the real family name and role", async () => {
    mocks.requireAdult.mockResolvedValue(actor);
    mocks.getFamilyOverview.mockResolvedValue({
      familyName: "Jane's Family",
      displayName: "Jane",
      role: "OWNER",
    });

    render(await FamilyPage());

    expect(screen.getByRole("heading", { level: 1, name: "Welcome back, Jane" })).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Jane's Family" });
    expect(within(summary).getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Your family has 0 members.")).toBeInTheDocument();
  });

  it("shows a manager's role", async () => {
    mocks.requireAdult.mockResolvedValue({ ...actor, role: "MANAGER" });
    mocks.getFamilyOverview.mockResolvedValue({
      familyName: "Jane's Family",
      displayName: "Sam",
      role: "MANAGER",
    });

    render(await FamilyPage());

    expect(screen.getByText("Manager")).toBeInTheDocument();
  });

  it("offers profile creation and leaves only future features marked coming soon", async () => {
    mocks.requireAdult.mockResolvedValue(actor);
    mocks.getFamilyOverview.mockResolvedValue({
      familyName: "Jane's Family",
      displayName: "Jane",
      role: "OWNER",
    });

    render(await FamilyPage());

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Add Family Member" })).toHaveAttribute("href", "/family/members/add");
    expect(screen.getAllByText("Coming soon")).toHaveLength(3);
    expect(screen.queryByText("Create your family")).not.toBeInTheDocument();
  });

  it.each([1, 2])("shows the real count of %s managed profiles", async (count) => {
    mocks.requireAdult.mockResolvedValue(actor);
    mocks.getFamilyOverview.mockResolvedValue({ familyName: "Jane's Family", displayName: "Jane", role: "OWNER" });
    mocks.countManagedProfiles.mockResolvedValue(count);
    render(await FamilyPage());
    expect(mocks.countManagedProfiles).toHaveBeenCalledWith(actor);
    expect(screen.getByText(`Your family has ${count} ${count === 1 ? "member" : "members"}.`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Family Members" })).toHaveAttribute("href", "/family/members");
  });
});
