import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { makeManagerRequest, requestIds } from "@/test/factories/requests";
import { requestsCopy as copy } from "../../copy";
import { REQUEST_STATUSES } from "../../limits";
import { ManagerInbox } from "./ManagerInbox";
import { ManagerInboxSkeleton } from "./ManagerInboxSkeleton";

describe("manager request inbox", () => {
	it("labels the status filter and offers every supported status", () => {
		render(<ManagerInbox result={{ requests: [], nextCursor: null }} />);

		const select = screen.getByRole("combobox", { name: copy.statusFilter });
		expect(select).toHaveValue("");
		expect(within(select).getAllByRole("option")).toHaveLength(REQUEST_STATUSES.length + 1);
		fireEvent.change(select, { target: { value: "PENDING_REVIEW" } });
		expect(select).toHaveValue("PENDING_REVIEW");
		expect(select.closest("form")).toHaveAttribute("action", "/family/requests");
		expect(screen.getByRole("button", { name: copy.applyFilter })).toHaveAttribute("type", "submit");
	});

	it("restores the active filter and clears both filter and cursor", () => {
		render(<ManagerInbox result={{ requests: [], nextCursor: null }} status="PAID" />);

		expect(screen.getByRole("combobox", { name: copy.statusFilter })).toHaveValue("PAID");
		expect(screen.getByRole("link", { name: copy.clearFilter })).toHaveAttribute("href", "/family/requests");
		expect(screen.getByRole("heading", { name: copy.filteredEmpty })).toBeInTheDocument();
		expect(screen.queryByText(copy.empty)).not.toBeInTheDocument();
		expect(screen.getByText(copy.inboxFilteredOrder)).toBeInTheDocument();
	});

	it("shows a page-scoped count without implying a family-wide total", () => {
		render(<ManagerInbox result={{ requests: [makeManagerRequest()], nextCursor: requestIds.other }} />);

		const results = screen.getByRole("region", { name: copy.inboxResults });
		expect(within(results).getByText("1 request on this page")).toBeInTheDocument();
		expect(within(results).getByText(copy.inboxOrder)).toBeInTheDocument();
		expect(within(results).getByText(copy.demo)).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: copy.clearFilter })).not.toBeInTheDocument();
	});

	it("explains an empty inbox without creating requests or payment controls", () => {
		render(<ManagerInbox result={{ requests: [], nextCursor: null }} />);

		expect(screen.getByRole("heading", { name: copy.empty })).toBeInTheDocument();
		expect(screen.getByText(copy.emptyHelp)).toBeInTheDocument();
		expect(screen.getByText("0 requests on this page")).toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /pay|checkout/i })).not.toBeInTheDocument();
	});

	it("announces loading without exposing placeholder controls or requests", () => {
		render(<ManagerInboxSkeleton />);

		expect(screen.getByRole("status")).toHaveTextContent(copy.loading);
		expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
	});
});
