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
	it.each(["DECLINED", "CANCELLED", "PAID", "AWAITING_PAYMENT"] as const)("omits edit/cancel/decline controls for %s", (status) => {
		render(<RequestDetail request={makeManagerRequest({ status, editable: false })} />);
		expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Decline request" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Cancel this list" })).not.toBeInTheDocument();
	});
	it("shows demo snapshots, totals and requested origin to managers", () => {
		render(<RequestDetail request={makeManagerRequest()} />);
		expect(screen.getByText("Demo unit price: $2.50")).toBeInTheDocument();
		expect(screen.getByText("Demo line total: $5.00")).toBeInTheDocument();
		expect(screen.getByText("Demo basket total: $5.00")).toBeInTheDocument();
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
		expect(screen.getByText(/Suggested.*Substitute/i)).toBeInTheDocument();
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
		expect(fake.refresh).not.toHaveBeenCalled(); expect(screen.getByText("Demo basket total: $5.00")).toBeInTheDocument();
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
	it("announces loading and has a working retry action", () => {
		const retry = vi.fn();
		render(<><RequestSkeleton /><RequestError retry={retry} /></>);
		expect(screen.getByRole("status")).toHaveTextContent("Loading shopping lists…");
		fireEvent.click(screen.getByRole("button", { name: "Try again" })); expect(retry).toHaveBeenCalledOnce();
	});
});
