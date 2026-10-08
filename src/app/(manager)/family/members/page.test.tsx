import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdult: vi.fn(), list: vi.fn(), notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.requireAdult }));
vi.mock("@/features/profiles/server/service", () => ({ listManagedProfiles: mocks.list }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
import MembersPage from "./page";

const actor = { type: "adult", userId: "user-rose", familyId: "family-rose", role: "OWNER" };
describe("MembersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdult.mockResolvedValue(actor);
    mocks.list.mockResolvedValue({ profiles: [], nextCursor: null });
  });
  it("authenticates before reading family profiles", async () => {
    mocks.requireAdult.mockRejectedValue(new Error("SIGN_IN"));
    await expect(MembersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("SIGN_IN");
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("renders real empty state with one add action", async () => {
    render(await MembersPage({ searchParams: Promise.resolve({}) }));
    expect(mocks.list).toHaveBeenCalledWith(actor, {});
    expect(screen.getByRole("link", { name: "Add Family Member" })).toHaveAttribute("href", "/family/members/add");
  });
  it("validates pagination input before queries", async () => {
    await expect(MembersPage({ searchParams: Promise.resolve({ after: "invalid" }) })).rejects.toThrow("NOT_FOUND");
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
