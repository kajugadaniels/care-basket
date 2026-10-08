// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));

import { requireAuthenticatedUser } from "./require-authenticated-user";

describe("requireAuthenticatedUser", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.currentUser.mockReset();
  });

  it("redirects visitors without a session to sign-in", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    const redirectToSignIn = vi.fn(() => {
      throw redirectError;
    });
    mocks.auth.mockResolvedValue({ userId: null, redirectToSignIn });

    await expect(requireAuthenticatedUser()).rejects.toBe(redirectError);
    expect(redirectToSignIn).toHaveBeenCalledOnce();
    expect(mocks.currentUser).not.toHaveBeenCalled();
  });

  it("returns only the Clerk user ID and first name for a signed-in adult", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_123", redirectToSignIn: vi.fn() });
    mocks.currentUser.mockResolvedValue({
      firstName: "Anna",
      emailAddresses: [{ emailAddress: "anna@example.com" }],
    });

    await expect(requireAuthenticatedUser()).resolves.toEqual({
      clerkUserId: "user_123",
      firstName: "Anna",
    });
  });

  it("returns a null first name when the account has none", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_123", redirectToSignIn: vi.fn() });
    mocks.currentUser.mockResolvedValue({ firstName: "   " });

    await expect(requireAuthenticatedUser()).resolves.toEqual({
      clerkUserId: "user_123",
      firstName: null,
    });
  });
});
