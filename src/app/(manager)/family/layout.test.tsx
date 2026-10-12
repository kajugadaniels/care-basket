import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { familyLayoutCopy } from "@/features/family/copy";
import { requestNotificationsCopy } from "@/features/requests/copy";
import { requestManager } from "@/test/factories/requests";
import { resolveServerTree, serverFallbackTree } from "@/test/resolve-server-tree";
import FamilyLayout from "./layout";

const fake = vi.hoisted(() => ({ user: vi.fn(), membership: vi.fn(), notifications: vi.fn(), failure: vi.fn() }));
vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));
vi.mock("next/navigation", () => ({ usePathname: () => "/family" }));
vi.mock("@/server/auth/ensure-user", () => ({ ensureUser: fake.user }));
vi.mock("@/server/auth/family-membership", () => ({ findFamilyMembership: fake.membership }));
vi.mock("@/features/requests/server/service", () => ({ getRequestNotifications: fake.notifications }));
vi.mock("@/features/requests/server/action-failure", () => ({ requestFailure: fake.failure }));

async function renderLayout() {
	return render(await resolveServerTree(FamilyLayout({ children: <p>Dashboard content</p> })));
}

describe("FamilyLayout", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.user.mockResolvedValue({ id: requestManager.userId });
		fake.membership.mockResolvedValue({ familyId: requestManager.familyId, role: "OWNER" });
		fake.notifications.mockResolvedValue({ count: 0, notifications: [] });
	});
	it("shows one shared test-environment notice outside the page content", async () => {
		await renderLayout();

		expect(screen.getAllByText(familyLayoutCopy.testEnvironment)).toHaveLength(1);
		expect(within(screen.getByRole("main")).queryByText(familyLayoutCopy.testEnvironment)).not.toBeInTheDocument();
	});

  it("starts with a skip link to the family main content", async () => {
    await renderLayout();

    const [firstLink] = screen.getAllByRole("link");
    expect(firstLink).toHaveAccessibleName("Skip to main content");
    expect(firstLink).toHaveAttribute("href", "#family-main");
  });

  it("renders page content inside the main landmark", async () => {
    await renderLayout();

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "family-main");
    expect(within(main).getByText("Dashboard content")).toBeInTheDocument();
  });

  it("labels the family navigation and marks the current page", async () => {
    await renderLayout();

    const nav = screen.getByRole("navigation", { name: "Family manager" });
    const overview = within(nav).getByRole("link", { name: "Overview" });
    expect(overview).toHaveAttribute("href", "/family");
    expect(overview).toHaveAttribute("aria-current", "page");
  });

  it("offers the Clerk account menu", async () => {
    await renderLayout();

    expect(screen.getByRole("button", { name: "Open account menu" })).toBeInTheDocument();
  });

  it("links only to implemented routes", async () => {
    await renderLayout();

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
		expect(new Set(hrefs)).toEqual(new Set(["#family-main", "/family", "/family/members", "/family/devices", "/family/requests"]));
  });

	it("places the notification bell directly before the Clerk account button", async () => {
		await renderLayout();
		const buttons = within(screen.getByRole("banner")).getAllByRole("button");
		expect(buttons[0]).toHaveAccessibleName(requestNotificationsCopy.bell(0));
		expect(buttons[1]).toHaveAccessibleName("Open account menu");
		expect(fake.membership).toHaveBeenCalledWith(requestManager.userId);
		expect(fake.notifications).toHaveBeenCalledWith(requestManager);
	});

	it("keeps setup accessible before the adult has a family", async () => {
		fake.membership.mockResolvedValue(null);
		await renderLayout();
		expect(screen.queryByRole("button", { name: /^Notifications/ })).not.toBeInTheDocument();
		expect(fake.notifications).not.toHaveBeenCalled();
		expect(screen.getByRole("main")).toHaveTextContent("Dashboard content");
	});

	it("keeps the header usable while notification data streams", () => {
		render(serverFallbackTree(FamilyLayout({ children: <p>Dashboard content</p> })));
		expect(screen.getByRole("button", { name: requestNotificationsCopy.refreshing })).toHaveAttribute("aria-busy", "true");
		expect(screen.getByRole("button", { name: "Open account menu" })).toBeInTheDocument();
		expect(fake.user).not.toHaveBeenCalled();
		expect(fake.notifications).not.toHaveBeenCalled();
	});

	it("does not take down family pages when notification queries fail", async () => {
		fake.notifications.mockRejectedValue(new Error("Database unavailable"));
		await renderLayout();
		expect(screen.getByRole("button", { name: requestNotificationsCopy.title })).toBeInTheDocument();
		expect(screen.getByRole("main")).toHaveTextContent("Dashboard content");
		expect(fake.failure).toHaveBeenCalledWith(expect.any(Error), "requests.notifications_failed");
	});
});
