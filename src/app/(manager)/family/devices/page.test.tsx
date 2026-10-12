import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeDeviceAdult } from "@/test/factories/devices";
import { resolveServerTree, serverFallbackTree } from "@/test/resolve-server-tree";
const fake = vi.hoisted(() => ({ adult: vi.fn(), list: vi.fn() }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: fake.adult }));
vi.mock("@/features/devices/server/service", () => ({ listDevices: fake.list }));
vi.mock("@/features/devices/actions", () => ({ revokeDeviceAction: vi.fn() }));
import DevicesPage from "./page";

function renderDevicesPage() {
	return resolveServerTree(DevicesPage({ searchParams: Promise.resolve({}) }));
}

describe("manager device list route", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.adult.mockResolvedValue(makeDeviceAdult());
		fake.list.mockResolvedValue({ devices: [], nextCursor: null });
	});
	it("loads the server-resolved adult's own devices and offers the implemented connection route", async () => {
		render(await renderDevicesPage());
		expect(fake.list).toHaveBeenCalledWith(makeDeviceAdult(), {});
		expect(screen.getByRole("link", { name: "Connect a Device" })).toHaveAttribute("href", "/family/devices/connect");
		expect(screen.getAllByRole("link", { name: "Connect a Device" })).toHaveLength(1);
		expect(screen.queryByText("Manage the browsers connected to your family members.")).not.toBeInTheDocument();
	});
	it("retains cursor navigation without changing the authenticated family scope", async () => {
		const after = "0199ca00-0000-7000-8000-000000000001";
		const nextCursor = "0199ca00-0000-7000-8000-000000000002";
		fake.list.mockResolvedValue({ devices: [], nextCursor });

		render(await resolveServerTree(DevicesPage({ searchParams: Promise.resolve({ after }) })));

		expect(fake.adult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
		expect(fake.list).toHaveBeenCalledWith(makeDeviceAdult(), { after });
		expect(screen.getByRole("link", { name: "More Devices" })).toHaveAttribute("href", `/family/devices?after=${nextCursor}`);
		expect(screen.getByRole("link", { name: "Back to First Devices" })).toHaveAttribute("href", "/family/devices");
	});
	it("reads the session only inside the streamed device list", () => {
		DevicesPage({ searchParams: Promise.resolve({}) });
		expect(fake.adult).not.toHaveBeenCalled();
	});
	it("cannot load device data with only a requester session", async () => {
		fake.adult.mockRejectedValue(new Error("SIGN_IN"));
		await expect(renderDevicesPage()).rejects.toThrow("SIGN_IN");
		expect(fake.list).not.toHaveBeenCalled();
	});
	it("shows the real header and connect action while the device cards load", () => {
		render(serverFallbackTree(DevicesPage({ searchParams: Promise.resolve({}) })));
		expect(screen.getByRole("heading", { level: 1, name: "Devices" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Connect a Device" })).toHaveAttribute("href", "/family/devices/connect");
		expect(screen.getByRole("status")).toHaveTextContent("Loading your family workspace…");
		expect(fake.adult).not.toHaveBeenCalled();
		expect(fake.list).not.toHaveBeenCalled();
	});
});
