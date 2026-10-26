import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestNotificationsCopy as copy } from "../../copy";
import type { RequestNotificationsDto } from "../../types";
import { RequestNotifications } from "./RequestNotifications";

const fake = vi.hoisted(() => ({
	refresh: vi.fn(), failed: false, pending: false, accessLost: false, announcement: "", failureMessage: "",
}));
vi.mock("../../hooks/use-request-notifications", () => ({
	useRequestNotifications: (data: RequestNotificationsDto | null) => ({
		data, failed: fake.failed || data === null, pending: fake.pending, accessLost: fake.accessLost,
		announcement: fake.announcement, refresh: fake.refresh,
		failureMessage: fake.failureMessage,
	}),
}));

const data: RequestNotificationsDto = {
	count: 1,
	notifications: [{ id: "rose-list", displayName: "Rose", submittedAt: "2026-10-12T12:30:00Z", message: "Rose has sent a shopping list." }],
};

function open() {
	const trigger = screen.getByRole("button", { name: /^Notifications/ });
	fireEvent.click(trigger);
	return trigger;
}

describe("request notification bell", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.failed = false;
		fake.pending = false;
		fake.accessLost = false;
		fake.announcement = "";
		fake.failureMessage = copy.error;
	});

	it("exposes the pending count and opens a linked notification without clearing it", () => {
		render(<RequestNotifications initialData={data} />);
		expect(screen.queryByRole("region")).not.toBeInTheDocument();
		const trigger = open();

		expect(trigger).toHaveAccessibleName("Notifications, 1 shopping list waiting for review");
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		const panel = screen.getByRole("region", { name: copy.title });
		expect(trigger).toHaveAttribute("aria-controls", panel.id);
		expect(within(panel).getByRole("link", { name: /Rose has sent a shopping list/ })).toHaveAttribute("href", "/family/requests/rose-list");
		expect(within(panel).getByRole("link", { name: copy.viewAll })).toHaveAttribute("href", "/family/requests");
		expect(within(panel).getByText("October 12, 2026 · 12:30 PM UTC")).toHaveAttribute("datetime", data.notifications[0].submittedAt);
		expect(fake.refresh).toHaveBeenCalledTimes(1);
	});

	it("closes with Escape or the close button and restores trigger focus", () => {
		render(<RequestNotifications initialData={data} />);
		const trigger = open();
		const close = screen.getByRole("button", { name: copy.close });
		close.focus();
		fireEvent.keyDown(close, { key: "Escape" });
		expect(trigger).toHaveFocus();
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		open();
		fireEvent.click(screen.getByRole("button", { name: copy.close }));
		expect(trigger).toHaveFocus();
		expect(screen.queryByRole("region")).not.toBeInTheDocument();
	});

	it("dismisses on an outside pointer press without taking focus", () => {
		render(<><button type="button">Other action</button><RequestNotifications initialData={data} /></>);
		const trigger = open();
		const other = screen.getByRole("button", { name: "Other action" });
		other.focus();
		fireEvent.pointerDown(other);
		expect(trigger).toHaveAttribute("aria-expanded", "false");
		expect(other).toHaveFocus();
	});

	it("shows a calm empty state without a zero badge", () => {
		render(<RequestNotifications initialData={{ count: 0, notifications: [] }} />);
		open();
		expect(screen.getByRole("heading", { name: copy.empty })).toBeInTheDocument();
		expect(screen.getByText(copy.emptyHelp)).toBeInTheDocument();
		expect(screen.queryByText("0")).not.toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});

	it("caps the visual badge but preserves the exact accessible count", () => {
		render(<RequestNotifications initialData={{ ...data, count: 125 }} />);
		expect(screen.getByRole("button", { name: copy.bell(125) })).toBeInTheDocument();
		expect(screen.getByText("99+")).toHaveAttribute("aria-hidden", "true");
	});

	it("keeps prior notifications visible beside inline recovery after a failed refresh", () => {
		fake.failed = true;
		render(<RequestNotifications initialData={data} />);
		open();
		expect(screen.getByRole("alert")).toHaveTextContent(copy.error);
		expect(screen.getByRole("link", { name: /Rose has sent a shopping list/ })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: copy.retry }));
		expect(fake.refresh).toHaveBeenCalledTimes(2);
	});

	it("does not claim an empty inbox when initial loading failed", () => {
		render(<RequestNotifications initialData={null} />);
		expect(screen.getByRole("button", { name: copy.title })).toBeInTheDocument();
		open();
		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(screen.queryByText(copy.empty)).not.toBeInTheDocument();
		expect(screen.queryByText("0 waiting for review")).not.toBeInTheDocument();
	});

	it("announces newly received lists politely without stealing focus", () => {
		fake.announcement = data.notifications[0].message;
		render(<RequestNotifications initialData={data} />);
		const trigger = screen.getByRole("button", { name: copy.bell(1) });
		trigger.focus();
		expect(screen.getByRole("status")).toHaveTextContent(fake.announcement);
		expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
		expect(trigger).toHaveFocus();
	});

	it("offers sign-in rather than a broken retry after access is lost", () => {
		fake.accessLost = true;
		fake.failureMessage = copy.sessionExpired;
		render(<RequestNotifications initialData={null} />);
		open();
		expect(screen.getByRole("alert")).toHaveTextContent(copy.sessionExpired);
		expect(screen.getByRole("link", { name: copy.signIn })).toHaveAttribute("href", "/sign-in");
		expect(screen.queryByRole("button", { name: copy.retry })).not.toBeInTheDocument();
	});
});
