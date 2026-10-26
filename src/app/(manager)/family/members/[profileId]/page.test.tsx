import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/server/errors";
import { resolveServerTree, serverFallbackTree } from "@/test/resolve-server-tree";
import { assistantCopy } from "@/features/assistant/copy";
import { profilesCopy } from "@/features/profiles/copy";

const mocks = vi.hoisted(() => ({ requireAdult: vi.fn(), get: vi.fn(), family: vi.fn(), preference: vi.fn(),
	notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }), push: vi.fn() }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.requireAdult }));
vi.mock("@/features/profiles/server/service", () => ({ getManagedProfile: mocks.get }));
vi.mock("@/features/family/server/service", () => ({ getFamilyOverview: mocks.family }));
vi.mock("@/features/assistant/server/service", () => ({ getAiPreference: mocks.preference }));
vi.mock("@/features/assistant/actions", () => ({ updateAiPreferenceAction: vi.fn() }));
vi.mock("@/features/profiles/actions", () => ({ createManagedProfileAction: vi.fn(), updateManagedProfileAction: vi.fn(), deleteManagedProfileAction: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound, useRouter: () => ({ push: mocks.push }) }));
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
		mocks.preference.mockResolvedValue({ enabled: false, available: false });
	});
	it.each([MemberPage, EditMemberPage])("maps cross-family lookups to the same not-found page", async (page) => {
		mocks.get.mockRejectedValue(new AppError("NOT_FOUND"));
		await expect(resolveServerTree(page({ params }))).rejects.toThrow("NOT_FOUND");
		expect(mocks.get).toHaveBeenCalledWith(actor, profile.id);
		expect(mocks.preference).not.toHaveBeenCalled();
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
	it("keeps details focused on the member with one action per purpose", async () => {
		render(await resolveServerTree(MemberPage({ params })));

		expect(screen.getByRole("heading", { level: 1, name: profilesCopy.detailTitle })).toBeInTheDocument();
		expect(screen.getByRole("heading", { level: 2, name: profile.displayName })).toBeInTheDocument();
		const device = screen.getByRole("region", { name: profilesCopy.deviceTitle });
		expect(within(device).getByText(profilesCopy.deviceNotice)).toBeInTheDocument();
		expect(within(device).getAllByRole("link")).toHaveLength(1);
		expect(screen.getAllByRole("link", { name: profilesCopy.edit })).toHaveLength(1);
		expect(screen.getAllByRole("button", { name: profilesCopy.remove })).toHaveLength(1);
		expect(screen.queryByText(/coming in a later step/i)).not.toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: assistantCopy.consentTitle })).not.toBeInTheDocument();
		expect(mocks.preference).not.toHaveBeenCalled();
	});
	it("loads the saved profile into the edit form", async () => {
		render(await resolveServerTree(EditMemberPage({ params })));
		expect(screen.getByRole("heading", { level: 1, name: "Edit family member" })).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: "What should we call them?" })).toHaveValue("Rose");
	});
	it("keeps separate AI consent controls on the assisted adult's edit page", async () => {
		render(await resolveServerTree(EditMemberPage({ params })));

		expect(mocks.preference).toHaveBeenCalledWith(actor, profile.id);
		expect(screen.getByRole("heading", { name: assistantCopy.consentTitle })).toBeInTheDocument();
		expect(screen.getByText(assistantCopy.blocked)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: assistantCopy.enable })).not.toBeInTheDocument();
	});
	it("does not load or expose AI preferences for a child", async () => {
		mocks.get.mockResolvedValue({ ...profile, kind: "CHILD" });
		render(await resolveServerTree(EditMemberPage({ params })));

		expect(screen.getByRole("textbox", { name: profilesCopy.nameLabel })).toHaveValue(profile.displayName);
		expect(mocks.preference).not.toHaveBeenCalled();
		expect(screen.queryByRole("heading", { name: assistantCopy.consentTitle })).not.toBeInTheDocument();
	});
	it("retains a historical child detail view without offering device connection", async () => {
		mocks.get.mockResolvedValue({ ...profile, kind: "CHILD" });
		render(await resolveServerTree(MemberPage({ params })));
		expect(screen.getByText(profilesCopy.legacyNotice)).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: profilesCopy.connectDevice })).not.toBeInTheDocument();
	});
	it.each([MemberPage, EditMemberPage])("authenticates each profile route independently", async (page) => {
		mocks.requireAdult.mockRejectedValue(new Error("SIGN_IN"));
		await expect(resolveServerTree(page({ params }))).rejects.toThrow("SIGN_IN");
		expect(mocks.get).not.toHaveBeenCalled();
		expect(mocks.preference).not.toHaveBeenCalled();
	});
	it.each([MemberPage, EditMemberPage])("reads the session only inside the streamed section", (page) => {
		page({ params });
		expect(mocks.requireAdult).not.toHaveBeenCalled();
	});
	it.each([MemberPage, EditMemberPage])("uses the shared progress loader without reading private data", (page) => {
		render(serverFallbackTree(page({ params })));

		expect(screen.getByRole("status")).toHaveTextContent("Loading your family workspace…");
		expect(screen.getByRole("link", { name: profilesCopy.back })).toHaveAttribute("href", "/family/members");
		expect(mocks.requireAdult).not.toHaveBeenCalled();
		expect(mocks.get).not.toHaveBeenCalled();
		expect(mocks.preference).not.toHaveBeenCalled();
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
