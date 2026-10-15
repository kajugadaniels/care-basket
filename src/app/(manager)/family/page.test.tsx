import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveServerTree, serverFallbackTree } from "@/test/resolve-server-tree";

const mocks = vi.hoisted(() => ({
	requireAdult: vi.fn(),
	getFamilyOverview: vi.fn(),
	countManagedProfiles: vi.fn(),
	countWaitingRequests: vi.fn(),
}));

vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.requireAdult }));
vi.mock("@/features/family/server/service", () => ({
	getFamilyOverview: mocks.getFamilyOverview,
}));
vi.mock("@/features/profiles/server/service", () => ({ countManagedProfiles: mocks.countManagedProfiles }));
vi.mock("@/features/requests/server/service", () => ({ countWaitingRequests: mocks.countWaitingRequests }));

import FamilyPage from "./page";
import FamilyLoading from "./loading";

const actor = { type: "adult", userId: "user-1", familyId: "family-1", role: "OWNER" };
const overview = { familyName: "Jane's Family", displayName: "Jane", role: "OWNER" };

async function renderPage() {
	render(await resolveServerTree(FamilyPage()));
}

describe("FamilyPage", () => {
	beforeEach(() => {
		mocks.requireAdult.mockReset();
		mocks.getFamilyOverview.mockReset();
		mocks.countManagedProfiles.mockReset();
		mocks.countManagedProfiles.mockResolvedValue(0);
		mocks.countWaitingRequests.mockReset();
		mocks.countWaitingRequests.mockResolvedValue(0);
	});

	it("reads the session only inside the streamed overview section", () => {
		FamilyPage();

		expect(mocks.requireAdult).not.toHaveBeenCalled();
	});

	it("requires a signed-in adult with a family before loading anything", async () => {
		const redirectError = new Error("NEXT_REDIRECT:/family/setup");
		mocks.requireAdult.mockRejectedValue(redirectError);

		await expect(resolveServerTree(FamilyPage())).rejects.toBe(redirectError);
		expect(mocks.getFamilyOverview).not.toHaveBeenCalled();
	});

	it("loads the overview for the session's own family", async () => {
		mocks.requireAdult.mockResolvedValue(actor);
		mocks.getFamilyOverview.mockResolvedValue(overview);

		await renderPage();

		expect(mocks.getFamilyOverview).toHaveBeenCalledWith(actor);
	});

	it("greets the adult by display name and shows the real family name and role", async () => {
		mocks.requireAdult.mockResolvedValue(actor);
		mocks.getFamilyOverview.mockResolvedValue(overview);

		await renderPage();

		expect(screen.getByRole("heading", { level: 1, name: "Welcome back, Jane" })).toBeInTheDocument();
		const summary = screen.getByRole("region", { name: "Jane's Family" });
		expect(within(summary).getByText("Owner")).toBeInTheDocument();
		expect(screen.getByText("0 family members")).toBeInTheDocument();
	});

	it("shows a manager's role", async () => {
		mocks.requireAdult.mockResolvedValue({ ...actor, role: "MANAGER" });
		mocks.getFamilyOverview.mockResolvedValue({ ...overview, displayName: "Sam", role: "MANAGER" });

		await renderPage();

		expect(screen.getByText("Manager")).toBeInTheDocument();
	});

	it("offers profile creation without stale planned-feature content", async () => {
		mocks.requireAdult.mockResolvedValue(actor);
		mocks.getFamilyOverview.mockResolvedValue(overview);

		await renderPage();

		expect(screen.queryAllByRole("button")).toHaveLength(0);
		expect(screen.getByRole("link", { name: "Add Family Member" })).toHaveAttribute("href", "/family/members/add");
		expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
		expect(screen.queryByText("Pay through PayPal")).not.toBeInTheDocument();
	});

	it.each([1, 2])("shows the real count of %s managed profiles", async (count) => {
		mocks.requireAdult.mockResolvedValue(actor);
		mocks.getFamilyOverview.mockResolvedValue(overview);
		mocks.countManagedProfiles.mockResolvedValue(count);

		await renderPage();

		expect(mocks.countManagedProfiles).toHaveBeenCalledWith(actor);
		expect(screen.getByText(`${count} ${count === 1 ? "family member" : "family members"}`)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "View Family Members" })).toHaveAttribute("href", "/family/members");
	});
	it("shows the authenticated family's real pending request count", async () => {
		mocks.requireAdult.mockResolvedValue(actor);
		mocks.getFamilyOverview.mockResolvedValue(overview);
		mocks.countWaitingRequests.mockResolvedValue(3);
		await renderPage();
		expect(mocks.countWaitingRequests).toHaveBeenCalledWith(actor);
		expect(screen.getByText("3 requests waiting for review")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Shopping requests" })).toHaveAttribute("href", "/family/requests");
	});
});

describe("FamilyLoading", () => {
	it("uses the shared manager loading state without placeholder controls", () => {
		render(<FamilyLoading />);

		expect(screen.getByRole("status")).toHaveTextContent("Loading your family workspace…");
		expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
	it("does not show stale dashboard content while the overview streams", () => {
		render(serverFallbackTree(FamilyPage()));
		expect(screen.getByRole("status")).toHaveTextContent("Loading your family workspace…");
		expect(screen.queryByText("Coming soon")).not.toBeInTheDocument();
	});
});
