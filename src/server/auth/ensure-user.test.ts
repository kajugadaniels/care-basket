// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireClerkUserId: vi.fn(),
  findOrCreateUserByClerkId: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/require-authenticated-user", () => ({
  requireClerkUserId: mocks.requireClerkUserId,
}));
vi.mock("@/server/users/user-repository", () => ({
  findOrCreateUserByClerkId: mocks.findOrCreateUserByClerkId,
}));

import { ensureUser } from "./ensure-user";

describe("ensureUser", () => {
  beforeEach(() => {
    mocks.requireClerkUserId.mockReset();
    mocks.findOrCreateUserByClerkId.mockReset();
  });

  it("rejects visitors without a session before touching the database", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    mocks.requireClerkUserId.mockRejectedValue(redirectError);

    await expect(ensureUser()).rejects.toBe(redirectError);
    expect(mocks.findOrCreateUserByClerkId).not.toHaveBeenCalled();
  });

  it("finds or creates the user for the Clerk ID from the session", async () => {
    const user = { id: "0192f0c2-0000-7000-8000-000000000001", clerkUserId: "user_123" };
    mocks.requireClerkUserId.mockResolvedValue("user_123");
    mocks.findOrCreateUserByClerkId.mockResolvedValue(user);

    await expect(ensureUser()).resolves.toEqual(user);
    expect(mocks.findOrCreateUserByClerkId).toHaveBeenCalledWith("user_123");
  });
});
