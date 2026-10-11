import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeManagerRequest, makeOwnRequest, requestIds } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ cancel: vi.fn(), decline: vi.fn(), update: vi.fn(), remove: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: fake.refresh }) }));
vi.mock("@/features/requests/actions", () => ({ cancelRequestAction: fake.cancel, declineRequestAction: fake.decline,
	updateRequestItemAction: fake.update, removeRequestItemAction: fake.remove }));
import { RequestDetail } from "./RequestDetail";
import { RequestList } from "./RequestList";
import { RequestSkeleton } from "./RequestSkeleton";
import { RequestError } from "./RequestError";

describe("shopping request screens", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		for (const action of [fake.cancel, fake.decline, fake.update, fake.remove]) action.mockResolvedValue({ ok: true, data: { requestId: requestIds.request } });
		Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
		Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
	});
	it("shows price-free details and requires deliberate cancellation", async () => {
		render(<RequestDetail request={makeOwnRequest()} />);
		expect(screen.queryByText(/\$|demo.*price/i)).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Cancel this list" }));
		const dialog = screen.getByRole("dialog", { name: "Cancel this shopping list?" });
		expect(within(dialog).getByRole("button", { name: "Keep shopping list" })).toHaveFocus();
		expect(fake.cancel).not.toHaveBeenCalled();
		fireEvent.click(within(dialog).getByRole("button", { name: "Yes, continue" }));
		await waitFor(() => expect(fake.cancel).toHaveBeenCalledWith({ requestId: requestIds.request, revision: 0, confirmed: true }));
		await waitFor(() => expect(fake.refresh).toHaveBeenCalled());
	});
	it("keeps the list when the cancellation dialog is dismissed", () => {
		render(<RequestDetail request={makeOwnRequest()} />);
		const trigger = screen.getByRole("button", { name: "Cancel this list" });
		fireEvent.click(trigger);
		fireEvent.click(screen.getByRole("button", { name: "Keep shopping list" }));
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); expect(fake.cancel).not.toHaveBeenCalled(); expect(trigger).toHaveFocus();
	});
	it("keeps payment confirmation distinct from delivery for requesters", () => {
		render(<RequestDetail request={makeOwnRequest({ status: "PAID", editable: false })} />);
		expect(screen.getByRole("region", { name: "Payment confirmed" })).toHaveTextContent("This does not mean the groceries have been delivered.");
		expect(screen.getByText("Demo only. No delivery has been arranged.")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /pay|checkout/i })).not.toBeInTheDocument();
	});
	it.each(["DECLINED", "CANCELLED", "PAID", "AWAITING_PAYMENT"] as const)("omits edit/cancel/decline controls for %s", (status) => {
		render(<RequestDetail request={makeManagerRequest({ status, editable: false })} />);
		expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Decline request" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Cancel this list" })).not.toBeInTheDocument();
	});
	it("shows snapshot prices with neutral labels and no repeated manager notice", () => {
		render(<RequestDetail request={makeManagerRequest()} />);
		const items = screen.getByRole("region", { name: "Requested groceries" });
		expect(within(items).getByText("Unit price").parentElement).toHaveTextContent("$2.50");
		expect(within(items).getByText("Line total").parentElement).toHaveTextContent("$5.00");
		const summary = screen.getByRole("region", { name: "Request summary" });
		expect(within(summary).getByText("Basket total").parentElement).toHaveTextContent("$5.00");
		expect(screen.queryByText(/CareBasket Demo Market|demo (unit|line|basket)/i)).not.toBeInTheDocument();
		expect(screen.getByText("Selected by requester")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /pay|approve/i })).not.toBeInTheDocument();
	});
	it("renders original text, suggested origin, substitutions and budget as manager context", () => {
		const request = makeManagerRequest({ budget: "$20.00", inputText: "Breakfast groceries" });
		request.items[0] = { ...request.items[0], origin: "SUGGESTED", isSubstitute: true, substitutionNote: "Different package size" };
		render(<RequestDetail request={request} />);
		expect(screen.getByText("Breakfast groceries")).toBeInTheDocument();
		expect(screen.getByText("Different package size")).toBeInTheDocument();
		expect(screen.getByText(/\$20\.00/)).toBeInTheDocument();
		expect(screen.getByText("Suggested item")).toBeInTheDocument();
		expect(screen.getByText("Substitute")).toBeInTheDocument();
	});
	it("sends manager quantity edits with a revision, never prices or ownership", async () => {
		render(<RequestDetail request={makeManagerRequest()} />);
		fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity: Demo milk" }), { target: { value: "3" } });
		fireEvent.click(screen.getByRole("button", { name: "Save quantity" }));
		await waitFor(() => expect(fake.update).toHaveBeenCalledWith({ requestId: requestIds.request, itemId: requestIds.item, revision: 0, quantity: 3 }));
		expect(await screen.findByText("Shopping list updated.")).toBeInTheDocument();
	});
	it("does not allow removing the last item", () => {
		render(<RequestDetail request={makeManagerRequest()} />);
		expect(screen.getByRole("button", { name: "Remove item: Demo milk" })).toBeDisabled();
	});
	it("removes a selected item without sending a product record", async () => {
		const request = makeManagerRequest(); request.items.push({ ...request.items[0], id: requestIds.other, sku: "demo-bread", displayName: "Demo bread" });
		render(<RequestDetail request={request} />);
		fireEvent.click(screen.getByRole("button", { name: "Remove item: Demo bread" }));
		await waitFor(() => expect(fake.remove).toHaveBeenCalledWith({ requestId: requestIds.request, itemId: requestIds.other, revision: 0 }));
	});
	it("focuses stale-edit conflicts and leaves data on screen", async () => {
		fake.update.mockResolvedValue({ ok: false, error: { code: "CONFLICT", message: "Refresh this list before trying again." } });
		render(<RequestDetail request={makeManagerRequest()} />);
		fireEvent.click(screen.getByRole("button", { name: "Save quantity" }));
		const error = await screen.findByRole("alert"); await waitFor(() => expect(error).toHaveFocus());
		expect(fake.refresh).not.toHaveBeenCalled();
		expect(within(screen.getByRole("region", { name: "Request summary" })).getByText("$5.00")).toBeInTheDocument();
	});
	it("groups member status, UTC time, products and summary in the manager detail layout", () => {
		const request = makeManagerRequest();
		request.items[0].imagePath = "/products/demo-milk.jpg";
		render(<RequestDetail request={request} />);

		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Demo Grandma's shopping list");
		const overview = screen.getByRole("region", { name: "Waiting for review" });
		expect(within(overview).getByText("Demo Grandma")).toBeInTheDocument();
		expect(within(overview).getByText("October 9, 2026")).toHaveAttribute("dateTime", request.submittedAt);
		expect(within(overview).getByText("12:00 PM UTC")).toBeInTheDocument();
		expect(screen.getByRole("list", { name: "Requested groceries" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { level: 3, name: "Demo milk" })).toBeInTheDocument();
		expect(screen.getByRole("img", { name: "Demo milk, 1 litre" }).getAttribute("src")).toContain("demo-milk.jpg");
		const summary = screen.getByRole("region", { name: "Request summary" });
		expect(within(summary).getByText("1 product")).toBeInTheDocument();
		expect(within(summary).getByRole("button", { name: "Decline request" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Back to shopping lists" })).toHaveAttribute("href", "/family/requests");
	});
	it("keeps manager payment status separate from delivery without exposing edit controls", () => {
		render(<RequestDetail request={makeManagerRequest({ status: "PAID", editable: false })} />);

		expect(screen.getByRole("region", { name: "Payment confirmed" })).toHaveTextContent("Delivery has not been confirmed.");
		expect(screen.getByText("Quantity: 2")).toBeInTheDocument();
		expect(within(screen.getByRole("region", { name: "Request summary" })).getByText("This list cannot be edited in its current status.")).toBeInTheDocument();
	});
	it("shows an empty manager item list without inventing products or controls", () => {
		render(<RequestDetail request={makeManagerRequest({ items: [], itemCount: 0, subtotal: "$0.00", editable: false })} />);

		expect(screen.getByText("This request has no groceries to review.")).toBeInTheDocument();
		expect(screen.queryByRole("list", { name: "Requested groceries" })).not.toBeInTheDocument();
		expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
		expect(screen.queryByRole("region", { name: "Original request" })).not.toBeInTheDocument();
	});
	it("disables all manager row controls while a quantity update is pending", async () => {
		fake.update.mockImplementation(() => new Promise(() => {}));
		const request = makeManagerRequest();
		request.items.push({ ...request.items[0], id: requestIds.other, sku: "demo-bread", displayName: "Demo bread" });
		render(<RequestDetail request={request} />);

		fireEvent.click(screen.getAllByRole("button", { name: "Save quantity" })[0]);
		await waitFor(() => expect(fake.update).toHaveBeenCalledOnce());
		for (const input of screen.getAllByRole("spinbutton")) expect(input).toBeDisabled();
		for (const button of screen.getAllByRole("button", { name: "Saving quantity…" })) expect(button).toBeDisabled();
		for (const button of screen.getAllByRole("button", { name: /^Remove item:/ })) expect(button).toBeDisabled();
	});
	it("reserves the manager detail loading layout without exposing placeholder controls", () => {
		render(<RequestSkeleton manager />);

		expect(screen.getByRole("status")).toHaveTextContent("Loading shopping lists…");
		expect(screen.queryByRole("heading")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
	});
	it("requires confirmation before declining", async () => {
		render(<RequestDetail request={makeManagerRequest()} />);
		fireEvent.click(screen.getByRole("button", { name: "Decline request" }));
		expect(fake.decline).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Yes, continue" }));
		await waitFor(() => expect(fake.decline).toHaveBeenCalledWith({ requestId: requestIds.request, revision: 0, confirmed: true }));
	});
	it("renders history with statuses and bounded pagination without prices", () => {
		render(<RequestList result={{ requests: [makeOwnRequest()], nextCursor: requestIds.other }} />);
		expect(screen.getByText("Waiting for review")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "View Details" })).toHaveAttribute("href", `/shop/requests/${requestIds.request}`);
		expect(screen.getByRole("link", { name: "More requests" })).toHaveAttribute("href", `/shop/requests?after=${requestIds.other}`);
		expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
	});
	it("shows the inbox empty state instead of fabricated records", () => {
		render(<RequestList result={{ requests: [], nextCursor: null }} manager />);
		expect(screen.getByText("No shopping requests yet.")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Review request" })).not.toBeInTheDocument();
	});
	it("shows member metadata, UTC submission time and labelled basket totals", () => {
		render(<RequestList result={{ requests: [makeManagerRequest()], nextCursor: null }} manager />);
		expect(screen.getByRole("heading", { name: "Demo Grandma" })).toBeInTheDocument();
		expect(screen.getByText("October 9, 2026")).toHaveAttribute("dateTime", "2026-10-09T12:00:00.000Z");
		expect(screen.getByText("12:00 PM UTC")).toBeInTheDocument();
		expect(screen.getByText("1 product")).toBeInTheDocument();
		expect(screen.getByText("Basket total")).toBeInTheDocument();
		expect(screen.getByText("$5.00")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Review request from Demo Grandma" })).toHaveAttribute("href", `/family/requests/${requestIds.request}`);
	});
	it.each(["DECLINED", "CANCELLED", "PAID", "AWAITING_PAYMENT"] as const)("offers viewing rather than a review action for %s", (status) => {
		render(<RequestList result={{ requests: [makeManagerRequest({ status })], nextCursor: null }} manager />);
		expect(screen.getByRole("link", { name: "View request from Demo Grandma" })).toHaveAttribute("href", `/family/requests/${requestIds.request}`);
		expect(screen.queryByRole("link", { name: /Review request/ })).not.toBeInTheDocument();
		expect(screen.queryByText(/Delivered/)).not.toBeInTheDocument();
	});
	it("preserves the manager status filter across cursor pagination", () => {
		render(<RequestList result={{ requests: [makeManagerRequest()], nextCursor: requestIds.other }} manager status="PENDING_REVIEW" />);
		expect(screen.getByRole("link", { name: "More requests" })).toHaveAttribute("href", `/family/requests?after=${requestIds.other}&status=PENDING_REVIEW`);
	});
	it("announces loading and has a working retry action", () => {
		const retry = vi.fn();
		render(<><RequestSkeleton /><RequestError retry={retry} /></>);
		expect(screen.getByRole("status")).toHaveTextContent("Loading shopping lists…");
		fireEvent.click(screen.getByRole("button", { name: "Try again" })); expect(retry).toHaveBeenCalledOnce();
	});
	it("offers pictures and focuses the error on a requester failure", () => {
		const retry = vi.fn();
		render(<RequestError retry={retry} requester />);
		expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
		expect(screen.getByRole("link", { name: "Back to groceries" })).toHaveAttribute("href", "/shop/products");
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(retry).toHaveBeenCalledOnce();
	});
});
