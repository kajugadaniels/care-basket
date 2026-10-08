// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureUser: vi.fn(),
  createFamilyForUser: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/ensure-user", () => ({ ensureUser: mocks.ensureUser }));
vi.mock("@/features/family/server/service", () => ({
  createFamilyForUser: mocks.createFamilyForUser,
}));

import type { CreateFamilyFormState } from "./types";
import { createFamilyAction } from "./actions";

const initialState: CreateFamilyFormState = {
  values: { familyName: "", displayName: "" },
  error: null,
};
const user = { id: "user-1", clerkUserId: "user_clerk_1" };

function formData(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  return data;
}

describe("createFamilyAction", () => {
  beforeEach(() => {
    mocks.ensureUser.mockReset();
    mocks.createFamilyForUser.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.redirect.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires a signed-in session on every call", async () => {
    const redirectError = new Error("NEXT_REDIRECT:/sign-in");
    mocks.ensureUser.mockRejectedValue(redirectError);

    await expect(
      createFamilyAction(initialState, formData({ familyName: "Jane's Family", displayName: "Jane" })),
    ).rejects.toBe(redirectError);
    expect(mocks.createFamilyForUser).not.toHaveBeenCalled();
  });

  it("returns friendly field errors and keeps what the adult typed", async () => {
    mocks.ensureUser.mockResolvedValue(user);

    const state = await createFamilyAction(
      initialState,
      formData({ familyName: " ", displayName: "Jane" }),
    );

    expect(state.values).toEqual({ familyName: " ", displayName: "Jane" });
    expect(state.error).toMatchObject({
      code: "VALIDATION_FAILED",
      fieldErrors: { familyName: ["Enter a name for your family."] },
    });
    expect(mocks.createFamilyForUser).not.toHaveBeenCalled();
  });

  it("creates the family for the session's user and opens the dashboard", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.createFamilyForUser.mockResolvedValue({ status: "created" });

    await expect(
      createFamilyAction(
        initialState,
        formData({ familyName: "  Jane's Family ", displayName: " Jane " }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/family");

    expect(mocks.createFamilyForUser).toHaveBeenCalledWith("user-1", {
      familyName: "Jane's Family",
      displayName: "Jane",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/family", "layout");
  });

  it("ignores user, family, and role values sent by the browser", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.createFamilyForUser.mockResolvedValue({ status: "created" });

    await expect(
      createFamilyAction(
        initialState,
        formData({
          familyName: "Jane's Family",
          displayName: "Jane",
          userId: "another-user",
          familyId: "another-family",
          role: "OWNER",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/family");

    expect(mocks.createFamilyForUser).toHaveBeenCalledWith("user-1", {
      familyName: "Jane's Family",
      displayName: "Jane",
    });
  });

  it("sends an adult who already has a family to the dashboard", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.createFamilyForUser.mockResolvedValue({ status: "existing" });

    await expect(
      createFamilyAction(initialState, formData({ familyName: "Jane's Family", displayName: "Jane" })),
    ).rejects.toThrow("NEXT_REDIRECT:/family");
  });

  it("shows a safe message without internal details when creation fails", async () => {
    mocks.ensureUser.mockResolvedValue(user);
    mocks.createFamilyForUser.mockRejectedValue(
      new Error("connect ECONNREFUSED postgresql://user:secret@host/db"),
    );

    const state = await createFamilyAction(
      initialState,
      formData({ familyName: "Jane's Family", displayName: "Jane" }),
    );

    expect(state.error).toEqual({
      code: "INTERNAL",
      message: "We couldn't create your family. Please try again in a moment.",
    });
    expect(JSON.stringify(state)).not.toContain("secret");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("secret");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
