import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdult: vi.fn(),
  getFamilyOverview: vi.fn(),
}));

vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.requireAdult }));
vi.mock("@/features/family/server/service", () => ({
  getFamilyOverview: mocks.getFamilyOverview,
}));

import FamilyPage from "./page";

const actor = { type: "adult", userId: "user-1", familyId: "family-1", role: "OWNER" };

describe("FamilyPage", () => {
  beforeEach(() => {
    mocks.requireAdult.mockReset();
    mocks.getFamilyOverview.mockReset();
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
    expect(screen.getByText("Your family is ready")).toBeInTheDocument();
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

  it("shows no fabricated members, counts, or actions for features that do not exist yet", async () => {
    mocks.requireAdult.mockResolvedValue(actor);
    mocks.getFamilyOverview.mockResolvedValue({
      familyName: "Jane's Family",
      displayName: "Jane",
      role: "OWNER",
    });

    render(await FamilyPage());

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getAllByText("Coming soon")).toHaveLength(4);
    expect(screen.queryByText("Create your family")).not.toBeInTheDocument();
  });
});
