import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/server/auth/require-authenticated-user", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

import FamilyPage from "./page";

describe("FamilyPage", () => {
  beforeEach(() => {
    mocks.requireAuthenticatedUser.mockReset();
  });

  it("requires a signed-in session before rendering anything", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    mocks.requireAuthenticatedUser.mockRejectedValue(redirectError);

    await expect(FamilyPage()).rejects.toBe(redirectError);
  });

  it("greets the signed-in adult by first name", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ clerkUserId: "user_1", firstName: "Anna" });
    render(await FamilyPage());

    expect(screen.getByRole("heading", { level: 1, name: "Welcome, Anna" })).toBeInTheDocument();
  });

  it("uses a neutral greeting when the account has no first name", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ clerkUserId: "user_1", firstName: null });
    render(await FamilyPage());

    expect(
      screen.getByRole("heading", { level: 1, name: "Welcome to CareBasket" }),
    ).toBeInTheDocument();
  });

  it("presents planned features as coming soon, with no actions", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ clerkUserId: "user_1", firstName: "Anna" });
    render(await FamilyPage());

    expect(screen.getByText("Family setup is coming soon")).toBeInTheDocument();
    expect(screen.getAllByText("Coming soon")).toHaveLength(5);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
