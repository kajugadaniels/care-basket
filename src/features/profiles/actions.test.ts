// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdult: vi.fn(), createManagedProfile: vi.fn(), updateManagedProfile: vi.fn(),
  deleteManagedProfile: vi.fn(), revalidatePath: vi.fn(),
  redirect: vi.fn((path: string) => { throw new Error(`NEXT_REDIRECT:${path}`); }),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith("NEXT_REDIRECT:")) throw error;
  },
}));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.requireAdult }));
vi.mock("./server/service", () => ({
  createManagedProfile: mocks.createManagedProfile, updateManagedProfile: mocks.updateManagedProfile,
  deleteManagedProfile: mocks.deleteManagedProfile,
}));

import { AppError } from "@/server/errors";
import { createManagedProfileAction, updateManagedProfileAction, deleteManagedProfileAction } from "./actions";

const actor = { type: "adult", userId: "user-rose", familyId: "family-rose", role: "OWNER" };
const profileId = "019a1234-0000-7000-8000-000000000003";
const createInput = { displayName: "  Rose  ", kind: "CHILD", avatarKey: "flower", consent: true };
const updateInput = { profileId, displayName: "Rose", avatarKey: "sun" };
const deleteInput = { profileId, confirmed: true };
const cases = [
  { name: "create", action: createManagedProfileAction, input: createInput, service: mocks.createManagedProfile, path: `/family/members/${profileId}` },
  { name: "update", action: updateManagedProfileAction, input: updateInput, service: mocks.updateManagedProfile, path: `/family/members/${profileId}` },
  { name: "delete", action: deleteManagedProfileAction, input: deleteInput, service: mocks.deleteManagedProfile, path: "/family/members" },
];

describe.each(cases)("$name managed profile action", ({ action, input, service, path }) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdult.mockResolvedValue(actor);
    service.mockResolvedValue({ profileId });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("authenticates before validation or mutation and preserves sign-in redirects", async () => {
    mocks.requireAdult.mockRejectedValue(new Error("NEXT_REDIRECT:/sign-in"));
    await expect(action(input)).rejects.toThrow("NEXT_REDIRECT:/sign-in");
    expect(service).not.toHaveBeenCalled();
  });
  it("maps an unauthorized manager role to a safe error", async () => {
    mocks.requireAdult.mockRejectedValue(new AppError("FORBIDDEN"));
    await expect(action(input)).resolves.toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(service).not.toHaveBeenCalled();
  });
  it("rejects extra client ownership fields", async () => {
    await expect(action({ ...input, familyId: "other-family" })).resolves.toMatchObject({
      ok: false, error: { code: "VALIDATION_FAILED" },
    });
    expect(service).not.toHaveBeenCalled();
  });
  it("requires OWNER or MANAGER and revalidates before supported navigation", async () => {
    await expect(action(input)).rejects.toThrow(`NEXT_REDIRECT:${path}`);
    expect(mocks.requireAdult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
    expect(service).toHaveBeenCalledWith(actor, { ...input, ...(input === createInput ? { displayName: "Rose" } : {}) });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/family", "layout");
    expect(mocks.redirect).toHaveBeenCalledWith(path);
  });
  it("returns NOT_FOUND without revealing another family", async () => {
    service.mockRejectedValue(new AppError("NOT_FOUND", "another family has this"));
    const result = await action(input);
    expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(JSON.stringify(result)).not.toContain("another family");
  });
  it("does not disclose or log database errors or personal text", async () => {
    service.mockRejectedValue(new Error("private connection details and Rose's name"));
    const result = await action(input);
    expect(result).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
    expect(JSON.stringify(result)).not.toContain("private connection");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("Rose");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("profile mutation validation", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireAdult.mockResolvedValue(actor); });
  it("rejects creation without consent", async () => {
    const result = await createManagedProfileAction({ ...createInput, consent: false });
    expect(result).toMatchObject({ ok: false, error: { fieldErrors: { consent: expect.any(Array) } } });
    expect(mocks.createManagedProfile).not.toHaveBeenCalled();
  });
  it("rejects a child-to-adult transition", async () => {
    await expect(updateManagedProfileAction({ ...updateInput, kind: "ASSISTED_ADULT" })).resolves.toMatchObject({ ok: false });
    expect(mocks.updateManagedProfile).not.toHaveBeenCalled();
  });
  it("rejects deletion without confirmation", async () => {
    await expect(deleteManagedProfileAction({ profileId })).resolves.toMatchObject({ ok: false });
    expect(mocks.deleteManagedProfile).not.toHaveBeenCalled();
  });
});
