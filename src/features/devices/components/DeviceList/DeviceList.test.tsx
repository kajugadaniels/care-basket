import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { devicesCopy } from "../../copy";
import type { DeviceDto } from "../../types";

vi.mock("../../actions", () => ({ revokeDeviceAction: vi.fn() }));

import { DeviceList } from "./DeviceList";

const device: DeviceDto = {
	id: "tablet",
	label: "Rose's tablet",
	profileName: "Rose",
	userAgentSummary: "Safari on iPad",
	createdAt: "2026-10-08T12:00:00Z",
	lastSeenAt: "2026-10-10T15:00:00Z",
	status: "ACTIVE",
};

describe("manager device list", () => {
	it("explains the empty state without duplicating the header's connect action", () => {
		render(<DeviceList devices={[]} />);

		const empty = screen.getByRole("region", { name: devicesCopy.empty });
		expect(within(empty).getByText(devicesCopy.emptyHelp)).toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("groups each device's identity and dates in an accessible named list", () => {
		render(<DeviceList devices={[device]} />);

		const card = within(screen.getByRole("list", { name: devicesCopy.title })).getByRole("listitem");
		const heading = within(card).getByRole("heading", { level: 2, name: device.label });
		expect(heading).toHaveAttribute("id", "device-tablet");
		expect(heading).toHaveAttribute("tabindex", "-1");
		expect(within(card).getByText("For Rose")).toBeInTheDocument();
		expect(within(card).getByText(device.userAgentSummary)).toBeInTheDocument();
		expect(within(card).getByText(devicesCopy.connected).nextElementSibling?.querySelector("time"))
			.toHaveAttribute("datetime", device.createdAt);
		expect(within(card).getByText(devicesCopy.lastActivity).nextElementSibling?.querySelector("time"))
			.toHaveAttribute("datetime", device.lastSeenAt);
		expect(within(card).getByText("October 8, 2026")).toBeInTheDocument();
		expect(within(card).getByText("October 10, 2026")).toBeInTheDocument();
		expect(screen.queryByText(/online/i)).not.toBeInTheDocument();
	});

	it("distinguishes all access states and offers disconnect only for active devices", () => {
		render(<DeviceList devices={[
			device,
			{ ...device, id: "expired", status: "EXPIRED" },
			{ ...device, id: "revoked", status: "REVOKED" },
		]} />);

		const cards = screen.getAllByRole("listitem");
		for (const [index, name] of ["Active", "Expired", "Revoked"].entries()) {
			expect(within(cards[index]).getByText(name)).toBeInTheDocument();
		}
		expect(within(cards[0]).getByRole("button", { name: devicesCopy.revoke })).toBeEnabled();
		for (const card of cards.slice(1)) {
			expect(within(card).queryByRole("button")).not.toBeInTheDocument();
		}
	});

	it("keeps long device labels and profile names complete", () => {
		const label = "A".repeat(40);
		const profileName = "B".repeat(40);
		render(<DeviceList devices={[{ ...device, label, profileName }]} />);

		expect(screen.getByRole("heading", { name: label })).toBeInTheDocument();
		expect(screen.getByText(devicesCopy.assignedTo(profileName))).toBeInTheDocument();
	});
});
