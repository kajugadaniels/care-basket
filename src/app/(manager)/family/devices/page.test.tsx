import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeDeviceAdult } from "@/test/factories/devices";
import { resolveServerTree } from "@/test/resolve-server-tree";
const fake = vi.hoisted(() => ({ adult: vi.fn(), list: vi.fn() }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: fake.adult }));
vi.mock("@/features/devices/server/service", () => ({ listDevices: fake.list }));
vi.mock("@/features/devices/actions", () => ({ revokeDeviceAction: vi.fn() }));
import DevicesPage from "./page";
import DevicesLoading from "./loading";

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
		render(<DevicesLoading />);
		expect(screen.getByRole("heading", { level: 1, name: "Devices" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Connect a Device" })).toHaveAttribute("href", "/family/devices/connect");
		expect(screen.getByRole("status")).toHaveTextContent("Loading devices…");
	});
});
