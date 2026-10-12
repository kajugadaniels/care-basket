import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds } from "@/test/factories/requests";
import type { CheckoutDto, CheckoutResult } from "../../types";
import { checkoutCopy as copy } from "../../copy";
const fake = vi.hoisted(() => ({ start: vi.fn(), cancel: vi.fn() }));
vi.mock("../../actions", () => ({ startCheckoutAction: fake.start, cancelCheckoutAction: fake.cancel }));
import { CheckoutPanel } from "./CheckoutPanel";

const prepared: CheckoutDto = { paymentId: requestIds.key, orderId: "ORDER1", state: "PREPARED", amount: "$5.00", buyerApprovalEnabled: false };
const props = { requestId: requestIds.request, revision: 0, editable: true, checkout: null };

describe("manager Sandbox checkout panel", () => {
	beforeEach(() => {
		vi.resetAllMocks(); fake.start.mockResolvedValue({ ok: true, data: prepared });
		fake.cancel.mockResolvedValue({ ok: true, data: { requestId: requestIds.request } });
		Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
		Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } });
	});
	it("prepares only on a deliberate click, using request ID/revision and no browser amount", async () => {
		render(<CheckoutPanel {...props} />);
		expect(fake.start).not.toHaveBeenCalled();
		expect(screen.getByText(copy.intro)).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: copy.prepare }));
		await screen.findByText(copy.prepared);
		expect(fake.start).toHaveBeenCalledWith({ requestId: props.requestId, revision: 0 });
		expect(screen.getByText("ORDER1")).toBeInTheDocument();
		expect(screen.getByText(copy.unavailable)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /pay with paypal/i })).not.toBeInTheDocument();
		expect(screen.queryByText(/payment confirmed|paid successfully/i)).not.toBeInTheDocument();
	});
	it("guards double preparation and shows truthful pending feedback", async () => {
		let complete: (result: CheckoutResult) => void = () => {};
		fake.start.mockImplementation(() => new Promise<CheckoutResult>((resolve) => { complete = resolve; }));
		render(<CheckoutPanel {...props} />);
		const button = screen.getByRole("button", { name: copy.prepare });
		fireEvent.click(button); fireEvent.click(button);
		expect(fake.start).toHaveBeenCalledOnce(); expect(button).toHaveAttribute("aria-busy", "true");
		expect(screen.queryByText(copy.prepared)).not.toBeInTheDocument();
		await act(async () => complete({ ok: true, data: prepared }));
		expect(screen.getByText(copy.prepared)).toBeInTheDocument();
	});
	it("focuses a price conflict inline and retains an explicit retry action", async () => {
		fake.start.mockResolvedValue({ ok: false, error: { code: "CONFLICT", message: copy.errors.PRICE_CHANGED } });
		render(<CheckoutPanel {...props} />);
		fireEvent.click(screen.getByRole("button", { name: copy.prepare }));
		const alert = await screen.findByRole("alert");
		await waitFor(() => expect(alert).toHaveFocus());
		expect(alert).toHaveTextContent(copy.errors.PRICE_CHANGED);
		expect(screen.getByRole("button", { name: copy.prepare })).toBeEnabled();
		expect(screen.queryByText("ORDER1")).not.toBeInTheDocument();
	});
	it("offers recovery for an order-less attempt without calling the action on mount", () => {
		render(<CheckoutPanel {...props} editable={false} checkout={{ ...prepared, orderId: null, state: "PREPARING" }} />);
		expect(screen.getByRole("button", { name: copy.retry })).toBeInTheDocument();
		expect(fake.start).not.toHaveBeenCalled();
	});
	it("requires deliberate cancellation, focuses the safe choice, and restores focus on dismissal", async () => {
		render(<CheckoutPanel {...props} revision={1} editable={false} checkout={prepared} />);
		const trigger = screen.getByRole("button", { name: copy.cancel });
		fireEvent.click(trigger);
		const dialog = screen.getByRole("dialog", { name: copy.cancelTitle });
		expect(within(dialog).getByRole("button", { name: copy.keep })).toHaveFocus();
		expect(fake.cancel).not.toHaveBeenCalled();
		fireEvent.click(within(dialog).getByRole("button", { name: copy.keep }));
		expect(trigger).toHaveFocus();
		fireEvent.click(trigger); fireEvent.click(screen.getByRole("button", { name: copy.confirmCancel }));
		await waitFor(() => expect(fake.cancel).toHaveBeenCalledWith({ requestId: props.requestId, revision: 1, paymentId: prepared.paymentId, confirmed: true }));
		await screen.findByText(copy.cancelled);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
	it("keeps an uncertain cancellation locked and displays the provider error inline", async () => {
		fake.cancel.mockResolvedValue({ ok: false, error: { code: "PAYMENT_PROVIDER_ERROR", message: copy.errors.PROVIDER } });
		render(<CheckoutPanel {...props} editable={false} checkout={prepared} />);
		fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
		fireEvent.click(screen.getByRole("button", { name: copy.confirmCancel }));
		expect(await screen.findByRole("alert")).toHaveTextContent(copy.errors.PROVIDER);
		expect(screen.getByText(copy.locked)).toBeInTheDocument();
		expect(screen.getByText("ORDER1")).toBeInTheDocument();
	});
	it("reconciles action feedback with the next authoritative server revision", async () => {
		const { rerender } = render(<CheckoutPanel {...props} />);
		fireEvent.click(screen.getByRole("button", { name: copy.prepare }));
		await screen.findByText(copy.prepared);
		rerender(<CheckoutPanel {...props} revision={2} checkout={null} />);
		expect(screen.queryByText("ORDER1")).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: copy.prepare })).toBeInTheDocument();
	});
});
