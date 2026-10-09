import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveServerTree } from "@/test/resolve-server-tree";

const mocks = vi.hoisted(() => ({ requireAdult: vi.fn(), list: vi.fn(), notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.requireAdult }));
vi.mock("@/features/profiles/server/service", () => ({ listManagedProfiles: mocks.list }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
import MembersPage from "./page";
import MembersLoading from "./loading";

const actor = { type: "adult", userId: "user-rose", familyId: "family-rose", role: "OWNER" };

function renderMembersPage(searchParams: Record<string, string> = {}) {
	return resolveServerTree(MembersPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("MembersPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireAdult.mockResolvedValue(actor);
		mocks.list.mockResolvedValue({ profiles: [], nextCursor: null });
	});
	it("reads the session only inside the streamed profile list", () => {
		MembersPage({ searchParams: Promise.resolve({}) });
		expect(mocks.requireAdult).not.toHaveBeenCalled();
	});
	it("authenticates before reading family profiles", async () => {
		mocks.requireAdult.mockRejectedValue(new Error("SIGN_IN"));
		await expect(renderMembersPage()).rejects.toThrow("SIGN_IN");
		expect(mocks.list).not.toHaveBeenCalled();
	});
	it("renders real empty state with one add action", async () => {
		render(await renderMembersPage());
		expect(mocks.list).toHaveBeenCalledWith(actor, {});
		expect(screen.getByRole("heading", { name: "Who would you like to help?" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Add Family Member" })).toHaveAttribute("href", "/family/members/add");
	});
	it("validates pagination input before queries", async () => {
		await expect(renderMembersPage({ after: "invalid" })).rejects.toThrow("NOT_FOUND");
		expect(mocks.list).not.toHaveBeenCalled();
	});
});

describe("MembersLoading", () => {
	it("shows the real header and add action while the profile cards load", () => {
		render(<MembersLoading />);
		expect(screen.getByRole("heading", { level: 1, name: "Family Members" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Add Family Member" })).toHaveAttribute("href", "/family/members/add");
		expect(screen.getByRole("status")).toHaveTextContent("Loading family members…");
	});
});
