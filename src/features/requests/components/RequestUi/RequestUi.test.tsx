import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeManagerRequest, makeOwnRequest, requestIds } from "@/test/factories/requests";
import { requestsCopy } from "../../copy";
import type { RequestMutationResult } from "../../types";
const fake = vi.hoisted(() => ({ cancel: vi.fn(), decline: vi.fn(), update: vi.fn(), remove: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: fake.refresh }) }));
vi.mock("@/features/checkout/actions", () => ({ startCheckoutAction: vi.fn(), cancelCheckoutAction: vi.fn(),
	captureCheckoutAction: vi.fn(), refreshCheckoutAction: vi.fn() }));
vi.mock("@/features/requests/actions", () => ({ cancelRequestAction: fake.cancel, declineRequestAction: fake.decline,
	updateRequestItemAction: fake.update, removeRequestItemAction: fake.remove }));
import { RequestDetail } from "./RequestDetail";
import { RequestList } from "./RequestList";
import { RequestSkeleton } from "./RequestSkeleton";
import { RequestError } from "./RequestError";

const pendingActions = new Set<(result: RequestMutationResult) => void>();

function deferredMutation() {
	let finish!: (result: RequestMutationResult) => void;
	const promise = new Promise<RequestMutationResult>((resolve) => { finish = resolve; });
	pendingActions.add(finish);
	return { promise, finish };
}

describe("shopping request screens", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		for (const action of [fake.cancel, fake.decline, fake.update, fake.remove]) action.mockResolvedValue({ ok: true, data: { requestId: requestIds.request } });
		Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
		Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
	});
	afterEach(async () => {
		// Unmounting does not finish async Actions. Settle them even if an assertion
		// failed so React's shared transition scope cannot leak into the next test.
		await act(async () => {
			for (const finish of pendingActions) finish({ ok: true, data: { requestId: requestIds.request } });
		});
		pendingActions.clear();
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
		await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
		expect(fake.refresh).not.toHaveBeenCalled();
	});
	it("never exposes checkout references or controls to requester details, even if supplied accidentally", () => {
		render(<RequestDetail request={makeOwnRequest({ status: "AWAITING_PAYMENT", editable: false })}
			checkout={{ paymentId: requestIds.key, orderId: "PRIVATEORDER1", state: "PREPARED", amount: "$5.00", buyerApprovalEnabled: false }} />);
		expect(screen.getByText("Your family is reviewing your shopping list.")).toBeInTheDocument();
		expect(screen.queryByText(/PRIVATEORDER1|\$5\.00|PayPal Sandbox/)).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /checkout|prepare|cancel/i })).not.toBeInTheDocument();
	});
	it("links below decline to dedicated checkout without mounting payment controls", () => {
		render(<RequestDetail request={makeManagerRequest()} checkout={null} />);
		const summary = screen.getByRole("region", { name: requestsCopy.managerSummary });
		const checkout = within(summary).getByRole("link", { name: "Checkout" });
		expect(checkout).toHaveAttribute("href", `/family/requests/${requestIds.request}/checkout`);
		expect(within(summary).getByRole("button", { name: requestsCopy.decline }).compareDocumentPosition(checkout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Prepare checkout" })).not.toBeInTheDocument();
		expect(screen.queryByText(/PayPal Sandbox checkout|Prepare a test order for the reviewed basket/)).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /pay with paypal/i })).not.toBeInTheDocument();
		expect(screen.queryByText("Payment confirmed")).not.toBeInTheDocument();
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
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Quantity saved for Demo milk: 3."));
		expect(fake.refresh).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.dismissSuccess }));
		expect(screen.getByRole("status")).toBeEmptyDOMElement();
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
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Demo bread removed from this request."));
	});
	it("focuses stale-edit conflicts and leaves data on screen", async () => {
		fake.update.mockResolvedValue({ ok: false, error: { code: "CONFLICT", message: "Refresh this list before trying again." } });
		render(<RequestDetail request={makeManagerRequest()} />);
		fireEvent.click(screen.getByRole("button", { name: "Save quantity" }));
		const error = await screen.findByRole("alert"); await waitFor(() => expect(error).toHaveFocus());
		expect(fake.refresh).not.toHaveBeenCalled();
		expect(screen.getByRole("status")).toHaveTextContent(requestsCopy.toastError);
		expect(within(screen.getByRole("region", { name: "Request summary" })).getByText("$5.00")).toBeInTheDocument();
	});
	it("groups member status, UTC time, products and summary in the manager detail layout", () => {
		const request = makeManagerRequest();
		request.items[0].imagePath = "/products/demo-milk.jpg";
		render(<RequestDetail request={request} />);

		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Demo Grandma's shopping list");
		const overview = screen.getByRole("region", { name: requestsCopy.statuses.PENDING_REVIEW });
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
	it("previews totals instantly without a Save spinner while serializing writes and allowing other drafts", async () => {
		const { promise, finish } = deferredMutation();
		fake.update.mockReturnValueOnce(promise);
		const request = makeManagerRequest();
		request.items.push({ ...request.items[0], id: requestIds.other, sku: "demo-bread", displayName: "Demo bread" });
		render(<RequestDetail request={request} />);

		fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity: Demo milk" }), { target: { value: "3" } });
		fireEvent.click(screen.getAllByRole("button", { name: "Save quantity" })[0]);
		await waitFor(() => expect(fake.update).toHaveBeenCalledOnce());
		expect(screen.getByRole("spinbutton", { name: "Quantity: Demo milk" })).toBeDisabled();
		const otherInput = screen.getByRole("spinbutton", { name: "Quantity: Demo bread" });
		expect(otherInput).toBeEnabled();
		fireEvent.change(otherInput, { target: { value: "4" } });
		expect(otherInput).toHaveValue(4);
		expect(screen.getAllByText(requestsCopy.managerSyncing)).toHaveLength(1);
		for (const save of screen.getAllByRole("button", { name: "Save quantity" })) {
			expect(save).toBeEnabled();
			expect(save).not.toHaveAttribute("aria-busy");
		}
		const summary = screen.getByRole("region", { name: requestsCopy.managerSummary });
		expect(within(summary).getByText("$12.50")).toBeInTheDocument();
		expect(within(summary).getByText(requestsCopy.managerPreview)).toBeInTheDocument();
		expect(within(screen.getByRole("list", { name: requestsCopy.managerItems })).getByText("$7.50")).toBeInTheDocument();
		expect(within(summary).getByRole("button", { name: requestsCopy.decline })).toBeEnabled();
		for (const button of screen.getAllByRole("button", { name: /^Remove item:/ })) expect(button).toBeEnabled();
		expect(screen.getByRole("status")).toBeEmptyDOMElement();
		fireEvent.click(screen.getAllByRole("button", { name: requestsCopy.save })[0]);
		fireEvent.click(screen.getAllByRole("button", { name: requestsCopy.save })[1]);
		fireEvent.click(screen.getByRole("button", { name: "Remove item: Demo bread" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.decline }));
		expect(fireEvent.click(within(summary).getByRole("link", { name: "Checkout" }))).toBe(false);
		expect(screen.getByRole("status")).toHaveTextContent(requestsCopy.actionBusyTitle);
		expect(screen.getByRole("status")).toHaveTextContent(requestsCopy.actionBusy);
		expect(fake.update).toHaveBeenCalledOnce();
		expect(fake.remove).not.toHaveBeenCalled();
		expect(fake.decline).not.toHaveBeenCalled();
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(otherInput).toHaveValue(4);
		expect(within(summary).getByText("$12.50")).toBeInTheDocument();
		await act(async () => finish({ ok: true, data: { requestId: requestIds.request } }));
		expect(screen.queryByText(requestsCopy.managerSyncing)).not.toBeInTheDocument();
		expect(screen.queryByText(requestsCopy.managerPreview)).not.toBeInTheDocument();
		expect(otherInput).toHaveValue(4);
	});
	it("preserves another row's draft across a confirmed save and server revision update", async () => {
		const request = makeManagerRequest();
		request.items.push({ ...request.items[0], id: requestIds.other, sku: "demo-bread", displayName: "Demo bread" });
		const { rerender } = render(<RequestDetail request={request} />);
		fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity: Demo bread" }), { target: { value: "4" } });
		fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity: Demo milk" }), { target: { value: "3" } });
		fireEvent.click(screen.getAllByRole("button", { name: "Save quantity" })[0]);
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Quantity saved for Demo milk: 3."));

		rerender(<RequestDetail request={{ ...request, revision: 1, items: [{ ...request.items[0], quantity: 3 }, request.items[1]] }} />);
		expect(screen.getByRole("spinbutton", { name: "Quantity: Demo bread" })).toHaveValue(4);
		fireEvent.click(screen.getAllByRole("button", { name: "Save quantity" })[1]);
		await waitFor(() => expect(fake.update).toHaveBeenLastCalledWith({ requestId: requestIds.request, itemId: requestIds.other, revision: 1, quantity: 4 }));
		await waitFor(() => expect(screen.queryByText(requestsCopy.managerSyncing)).not.toBeInTheDocument());
		expect(fake.update).toHaveBeenCalledTimes(2);
	});
	it("guards repeated submissions and only announces a save after server confirmation", async () => {
		const { promise, finish } = deferredMutation();
		fake.update.mockReturnValueOnce(promise);
		render(<RequestDetail request={makeManagerRequest()} />);
		const form = screen.getByRole("button", { name: "Save quantity" }).closest("form")!;
		fireEvent.submit(form);
		fireEvent.submit(form);
		expect(fake.update).toHaveBeenCalledOnce();
		expect(screen.getByRole("status")).toHaveTextContent(requestsCopy.actionBusy);
		await act(async () => finish({ ok: true, data: { requestId: requestIds.request } }));
		expect(screen.getByRole("status")).toHaveTextContent("Quantity saved for Demo milk: 2.");
		expect(fake.refresh).not.toHaveBeenCalled();
	});
	it("keeps removal controls enabled and rejects repeats without a button spinner", async () => {
		const { promise, finish } = deferredMutation();
		fake.remove.mockReturnValueOnce(promise);
		const request = makeManagerRequest();
		request.items.push({ ...request.items[0], id: requestIds.other, sku: "demo-bread", displayName: "Demo bread" });
		render(<RequestDetail request={request} />);
		const remove = screen.getByRole("button", { name: "Remove item: Demo bread" });
		fireEvent.click(remove);
		await waitFor(() => expect(fake.remove).toHaveBeenCalledOnce());
		expect(remove).toBeEnabled();
		expect(remove).not.toHaveAttribute("aria-busy");
		expect(remove).toHaveTextContent(requestsCopy.remove);
		expect(screen.getByText(requestsCopy.managerRemoving)).toBeInTheDocument();
		for (const save of screen.getAllByRole("button", { name: "Save quantity" })) expect(save).not.toHaveAttribute("aria-busy");
		fireEvent.click(remove);
		fireEvent.click(screen.getAllByRole("button", { name: requestsCopy.save })[0]);
		expect(screen.getByRole("status")).toHaveTextContent(requestsCopy.actionBusy);
		expect(fake.remove).toHaveBeenCalledOnce();
		expect(fake.update).not.toHaveBeenCalled();
		await act(async () => finish({ ok: true, data: { requestId: requestIds.request } }));
		expect(screen.queryByText(requestsCopy.managerRemoving)).not.toBeInTheDocument();
	});
	it("preserves a failed quantity edit and offers retry without a success toast", async () => {
		fake.update.mockRejectedValue(new Error("Connection interrupted"));
		render(<RequestDetail request={makeManagerRequest()} />);
		const input = screen.getByRole("spinbutton", { name: "Quantity: Demo milk" });
		fireEvent.change(input, { target: { value: "5" } });
		fireEvent.click(screen.getByRole("button", { name: "Save quantity" }));
		const error = await screen.findByRole("alert");
		await waitFor(() => expect(error).toHaveFocus());
		expect(input).toHaveValue(5);
		expect(error).toHaveTextContent(requestsCopy.managerConfirmFailed);
		expect(screen.getByRole("status")).toHaveTextContent(requestsCopy.toastError);
		expect(within(screen.getByRole("region", { name: requestsCopy.managerSummary })).getByText("$5.00")).toBeInTheDocument();
		expect(within(screen.getByRole("list", { name: requestsCopy.managerItems })).getByText("$5.00")).toBeInTheDocument();
		expect(screen.queryByText(requestsCopy.managerPreview)).not.toBeInTheDocument();
		expect(screen.queryByText(requestsCopy.managerSyncing)).not.toBeInTheDocument();
		await waitFor(() => expect(input).toBeEnabled());
		fake.update.mockResolvedValue({ ok: true, data: { requestId: requestIds.request } });
		fireEvent.click(screen.getByRole("button", { name: "Save quantity" }));
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Quantity saved for Demo milk: 5."));
		expect(fake.update).toHaveBeenCalledTimes(2);
	});
	it("rolls preview amounts back on rejection while retaining the exact input node and draft", async () => {
		const { promise, finish } = deferredMutation();
		fake.update.mockReturnValueOnce(promise);
		render(<RequestDetail request={makeManagerRequest()} />);
		const input = screen.getByRole("spinbutton", { name: "Quantity: Demo milk" });
		fireEvent.change(input, { target: { value: "5" } });
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.save }));
		const summary = screen.getByRole("region", { name: requestsCopy.managerSummary });
		expect(within(summary).getByText("$12.50")).toBeInTheDocument();
		await act(async () => finish({ ok: false, error: { code: "CONFLICT", message: "Refresh before retrying." } }));
		expect(within(summary).getByText("$5.00")).toBeInTheDocument();
		expect(screen.queryByText(requestsCopy.managerPreview)).not.toBeInTheDocument();
		expect(screen.queryByText(requestsCopy.managerSyncing)).not.toBeInTheDocument();
		expect(within(screen.getByRole("list", { name: requestsCopy.managerItems })).getByText("$5.00")).toBeInTheDocument();
		expect(screen.getByRole("spinbutton", { name: "Quantity: Demo milk" })).toBe(input);
		expect(input).toHaveValue(5);
		expect(screen.getByRole("alert")).toHaveTextContent("Refresh before retrying.");
	});
	it("reconciles preview with server totals and keeps sound control available during a save", async () => {
		const { promise, finish } = deferredMutation();
		fake.update.mockReturnValueOnce(promise);
		const request = makeManagerRequest();
		const { rerender } = render(<RequestDetail request={request} />);
		fireEvent.change(screen.getByRole("spinbutton", { name: "Quantity: Demo milk" }), { target: { value: "3" } });
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.save }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.soundOn }));
		expect(screen.getByRole("button", { name: requestsCopy.soundOff })).toHaveAttribute("aria-pressed", "false");
		expect(fake.update).toHaveBeenCalledOnce();
		expect(screen.getByRole("status")).toBeEmptyDOMElement();
		await act(async () => {
			rerender(<RequestDetail request={{ ...request, revision: 1, subtotalMinor: 750, subtotal: "$7.50",
				items: [{ ...request.items[0], quantity: 3, lineTotal: "$7.50" }] }} />);
			finish({ ok: true, data: { requestId: request.id } });
		});
		expect(screen.queryByText(requestsCopy.managerPreview)).not.toBeInTheDocument();
		expect(within(screen.getByRole("region", { name: requestsCopy.managerSummary })).getByText("$7.50")).toBeInTheDocument();
		expect(screen.getByRole("spinbutton", { name: "Quantity: Demo milk" })).toHaveValue(3);
		await act(async () => { fireEvent.click(screen.getByRole("button", { name: requestsCopy.save })); });
		expect(fake.update).toHaveBeenLastCalledWith({ requestId: request.id, revision: 1, itemId: requestIds.item, quantity: 3 });
		expect(fake.update).toHaveBeenCalledTimes(2);
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
		expect(screen.getByText(requestsCopy.statuses.PENDING_REVIEW)).toBeInTheDocument();
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
