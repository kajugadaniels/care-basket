import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/errors";
import { resolveServerTree } from "@/test/resolve-server-tree";

const mocks = vi.hoisted(() => ({ requireAdult: vi.fn(), get: vi.fn(), family: vi.fn(),
	notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.requireAdult }));
vi.mock("@/features/profiles/server/service", () => ({ getManagedProfile: mocks.get }));
vi.mock("@/features/family/server/service", () => ({ getFamilyOverview: mocks.family }));
vi.mock("@/features/profiles/actions", () => ({ createManagedProfileAction: vi.fn(), updateManagedProfileAction: vi.fn(), deleteManagedProfileAction: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
import MemberPage from "./page";
import EditMemberPage from "./edit/page";
import AddMemberPage from "../add/page";

const actor = { type: "adult", userId: "user-rose", familyId: "family-rose", role: "OWNER" };
const profile = { id: "profile-rose", displayName: "Rose", kind: "ASSISTED_ADULT", avatarKey: "flower", createdAt: "2026-10-08T12:00:00Z" };
const params = Promise.resolve({ profileId: profile.id });
describe("member detail, add, and edit pages", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.requireAdult.mockResolvedValue(actor);
		mocks.get.mockResolvedValue(profile);
		mocks.family.mockResolvedValue({ familyName: "Rose's Family" });
	});
	it.each([MemberPage, EditMemberPage])("maps cross-family lookups to the same not-found page", async (page) => {
		mocks.get.mockRejectedValue(new AppError("NOT_FOUND"));
		await expect(resolveServerTree(page({ params }))).rejects.toThrow("NOT_FOUND");
		expect(mocks.get).toHaveBeenCalledWith(actor, profile.id);
	});
	it("offers device connection with the owned profile as a suggestion", async () => {
		render(await resolveServerTree(MemberPage({ params })));
		expect(screen.getByRole("link", { name: "Back to Family Members" })).toHaveAttribute("href", "/family/members");
		expect(screen.getByRole("heading", { name: "Rose" })).toBeInTheDocument();
		expect(screen.getByText("Rose's Family")).toBeInTheDocument();
		expect(screen.getByText("October 8, 2026")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Edit Profile" })).toHaveAttribute("href", "/family/members/profile-rose/edit");
		expect(screen.getByRole("link", { name: "Connect Their Device" })).toHaveAttribute("href", "/family/devices/connect?profileId=profile-rose");
		expect(screen.queryByRole("button", { name: /connect/i })).not.toBeInTheDocument();
	});
	it("loads the saved profile into the edit form", async () => {
		render(await resolveServerTree(EditMemberPage({ params })));
		expect(screen.getByRole("heading", { level: 1, name: "Edit family member" })).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "What should we call them?" })).toHaveValue("Rose");
	});
	it.each([MemberPage, EditMemberPage])("authenticates each profile route independently", async (page) => {
		mocks.requireAdult.mockRejectedValue(new Error("SIGN_IN"));
		await expect(resolveServerTree(page({ params }))).rejects.toThrow("SIGN_IN");
		expect(mocks.get).not.toHaveBeenCalled();
	});
	it.each([MemberPage, EditMemberPage])("reads the session only inside the streamed section", (page) => {
		page({ params });
		expect(mocks.requireAdult).not.toHaveBeenCalled();
	});
	it("authenticates the add page independently", async () => {
		mocks.requireAdult.mockRejectedValue(new Error("SIGN_IN"));
		await expect(resolveServerTree(AddMemberPage())).rejects.toThrow("SIGN_IN");
	});
	it("renders the add form at once and streams the session check beside it", async () => {
		AddMemberPage();
		expect(mocks.requireAdult).not.toHaveBeenCalled();

		render(await resolveServerTree(AddMemberPage()));
		expect(screen.getByRole("link", { name: "Back to Family Members" })).toHaveAttribute("href", "/family/members");
		expect(screen.getByRole("heading", { level: 1, name: "Add a family member" })).toBeInTheDocument();
		expect(screen.getByRole("group", { name: "Choose an avatar" })).toBeInTheDocument();
		expect(mocks.requireAdult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
	});
});
