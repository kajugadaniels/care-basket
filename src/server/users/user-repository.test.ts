// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => db }));

import { findOrCreateUserByClerkId } from "./user-repository";

const storedUser = { id: "0192f0c2-0000-7000-8000-000000000001", clerkUserId: "user_123" };

function uniqueViolation() {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
}

describe("findOrCreateUserByClerkId", () => {
  beforeEach(() => {
    db.user.findUnique.mockReset();
    db.user.create.mockReset();
    db.user.findUniqueOrThrow.mockReset();
  });

  it("reuses an existing user without creating another", async () => {
    db.user.findUnique.mockResolvedValue(storedUser);

    await expect(findOrCreateUserByClerkId("user_123")).resolves.toEqual(storedUser);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it("creates the user on first authentication, storing only the Clerk user ID", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(storedUser);

    await expect(findOrCreateUserByClerkId("user_123")).resolves.toEqual(storedUser);
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { clerkUserId: "user_123" } }),
    );
  });

  it("uses the winning row when a simultaneous first request created the user", async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockRejectedValue(uniqueViolation());
    db.user.findUniqueOrThrow.mockResolvedValue(storedUser);

    await expect(findOrCreateUserByClerkId("user_123")).resolves.toEqual(storedUser);
    expect(db.user.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clerkUserId: "user_123" } }),
    );
  });

  it("lets unexpected database errors propagate", async () => {
    const failure = new Error("connection lost");
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockRejectedValue(failure);

    await expect(findOrCreateUserByClerkId("user_123")).rejects.toBe(failure);
    expect(db.user.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
