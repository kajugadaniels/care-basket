import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { devicesCopy } from "@/features/devices/copy";
import { AppError } from "@/server/errors";
import { deviceIds, makeDeviceAdult } from "@/test/factories/devices";
import { resolveServerTree, serverFallbackTree } from "@/test/resolve-server-tree";
const fake = vi.hoisted(() => ({ adult: vi.fn(), list: vi.fn(), profile: vi.fn() }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: fake.adult }));
vi.mock("@/features/profiles/server/service", () => ({ listManagedProfiles: fake.list, getManagedProfile: fake.profile }));
vi.mock("@/features/devices/components/ApprovalForm/ApprovalForm", () => ({
	ApprovalForm: ({ preselected, profiles }: { preselected?: string; profiles: { id: string; displayName: string }[] }) => <>
		<output aria-label="Suggested person">{preselected ?? "none"}</output>
		<ul aria-label="Eligible adults">{profiles.map((profile) => <li key={profile.id}>{profile.displayName}</li>)}</ul>
	</>,
}));
import DeviceConnectPage from "./page";

function renderConnectPage(searchParams: Record<string, string> = {}) {
	return resolveServerTree(DeviceConnectPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("manager approval route", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.adult.mockResolvedValue(makeDeviceAdult());
		fake.list.mockResolvedValue({ profiles: [{ id: deviceIds.profile, displayName: "Rose", kind: "ASSISTED_ADULT" }], nextCursor: null });
	});
	it("authenticates before loading profiles", async () => {
		fake.adult.mockRejectedValue(new Error("SIGN_IN"));
		await expect(renderConnectPage()).rejects.toThrow("SIGN_IN");
		expect(fake.list).not.toHaveBeenCalled();
	});
	it("provides an immediate loading state for the nested approval route", () => {
		render(serverFallbackTree(DeviceConnectPage({ searchParams: Promise.resolve({}) })));
		expect(screen.getByRole("heading", { level: 1, name: devicesCopy.approvalTitle })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: devicesCopy.backDevices })).toHaveAttribute("href", "/family/devices");
		expect(screen.getByRole("status")).toHaveTextContent("Loading your family workspace…");
		expect(fake.adult).not.toHaveBeenCalled();
		expect(fake.list).not.toHaveBeenCalled();
	});
	it("ignores a cross-family preselection rather than treating the URL as authorization", async () => {
		fake.profile.mockRejectedValue(new AppError("NOT_FOUND"));
		render(await renderConnectPage({ profileId: deviceIds.otherFamily }));
		expect(fake.profile).toHaveBeenCalledWith(makeDeviceAdult(), deviceIds.otherFamily);
		expect(screen.getByLabelText("Suggested person")).toHaveTextContent("none");
	});
	it("does not list or preselect a historical child, even when owned by the manager", async () => {
		const child = { id: deviceIds.otherFamily, displayName: "Sam", kind: "CHILD" };
		fake.list.mockResolvedValue({ profiles: [child,
			{ id: deviceIds.profile, displayName: "Rose", kind: "ASSISTED_ADULT" }], nextCursor: null });
		fake.profile.mockResolvedValue(child);
		render(await renderConnectPage({ profileId: child.id }));
		expect(screen.getByLabelText("Suggested person")).toHaveTextContent("none");
		expect(screen.getByRole("list", { name: "Eligible adults" })).toHaveTextContent("Rose");
		expect(screen.queryByText("Sam")).not.toBeInTheDocument();
	});
	it("keeps pagination available if a page contains only historical children", async () => {
		fake.list.mockResolvedValue({ profiles: [{ id: deviceIds.profile, displayName: "Sam", kind: "CHILD" }], nextCursor: deviceIds.profile });
		render(await renderConnectPage());
		expect(screen.getByText(devicesCopy.noProfiles)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: devicesCopy.moreProfiles }))
			.toHaveAttribute("href", `/family/devices/connect?after=${deviceIds.profile}`);
	});
});
