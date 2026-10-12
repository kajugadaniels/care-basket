import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveServerTree, serverFallbackTree } from "@/test/resolve-server-tree";
import { profilesCopy } from "@/features/profiles/copy";

const mocks = vi.hoisted(() => ({ requireAdult: vi.fn(), list: vi.fn(), notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.requireAdult }));
vi.mock("@/features/profiles/server/service", () => ({ listManagedProfiles: mocks.list }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
import MembersPage from "./page";

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
		expect(screen.getAllByRole("link", { name: profilesCopy.add })).toHaveLength(1);
		expect(screen.queryByRole("navigation", { name: profilesCopy.title })).not.toBeInTheDocument();
	});
	it("keeps directory content and pagination scoped to the current family", async () => {
		const after = "019a1234-0000-7000-8000-000000000001";
		const next = "019a1234-0000-7000-8000-000000000002";
		mocks.list.mockResolvedValue({
			profiles: [{ id: "rose", displayName: "Rose", kind: "ASSISTED_ADULT", avatarKey: "flower", createdAt: "2026-10-08T12:00:00Z" }],
			nextCursor: next,
		});

		render(await renderMembersPage({ after }));

		expect(mocks.requireAdult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
		expect(mocks.list).toHaveBeenCalledWith(actor, { after });
		expect(screen.getByRole("heading", { level: 1, name: profilesCopy.title })).toBeInTheDocument();
		expect(screen.getByRole("region", { name: profilesCopy.directoryTitle })).toBeInTheDocument();
		expect(screen.getByRole("navigation", { name: profilesCopy.title })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: profilesCopy.first })).toHaveAttribute("href", "/family/members");
		expect(screen.getByRole("link", { name: profilesCopy.next })).toHaveAttribute("href", `/family/members?after=${next}`);
	});
	it("validates pagination input before queries", async () => {
		await expect(renderMembersPage({ after: "invalid" })).rejects.toThrow("NOT_FOUND");
		expect(mocks.list).not.toHaveBeenCalled();
	});
});

describe("MembersPage loading", () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows the real header and add action while the profile cards load", () => {
		render(serverFallbackTree(MembersPage({ searchParams: Promise.resolve({}) })));
		expect(screen.getByRole("heading", { level: 1, name: "Family Members" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Add Family Member" })).toHaveAttribute("href", "/family/members/add");
		expect(screen.getByRole("status")).toHaveTextContent("Loading your family workspace…");
		expect(screen.getByText(profilesCopy.description)).toBeInTheDocument();
		expect(screen.queryByRole("article")).not.toBeInTheDocument();
		expect(mocks.requireAdult).not.toHaveBeenCalled();
	});
});
