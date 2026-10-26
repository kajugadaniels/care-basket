import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds } from "@/test/factories/requests";
import type { CheckoutDto, CheckoutResult } from "../../types";
import { checkoutCopy as copy } from "../../copy";
const fake = vi.hoisted(() => {
  const pageRefresh = vi.fn();
  return {
    start: vi.fn(),
    cancel: vi.fn(),
    refresh: vi.fn(),
    capture: vi.fn(),
    pageRefresh,
    router: { refresh: pageRefresh },
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => fake.router }));
vi.mock("../../actions", () => ({
  startCheckoutAction: fake.start,
  cancelCheckoutAction: fake.cancel,
  refreshCheckoutAction: fake.refresh,
  captureCheckoutAction: fake.capture,
}));
import { CheckoutPanel } from "./CheckoutPanel";

const prepared: CheckoutDto = {
  paymentId: requestIds.key,
  orderId: "ORDER1",
  state: "PREPARED",
  amount: "$5.00",
  buyerApprovalEnabled: false,
};
const props = {
  requestId: requestIds.request,
  revision: 0,
  editable: true,
  checkout: null,
};
const preparedResult: CheckoutResult = {
	ok: true,
	data: prepared,
	feedback: { kind: "success", message: copy.statuses.PREPARED },
};

describe("manager Sandbox checkout panel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fake.start.mockResolvedValue(preparedResult);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    fake.cancel.mockResolvedValue({
      ok: true,
      data: { requestId: requestIds.request },
		feedback: { kind: "success", message: copy.cancelled },
    });
    fake.refresh.mockResolvedValue({
      ok: true,
      data: { ...prepared, state: "PENDING", canCancel: false },
		feedback: { kind: "warning", message: copy.statuses.PENDING },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it("prepares only on a deliberate click, using request ID/revision and no browser amount", async () => {
    render(<CheckoutPanel {...props} />);
    expect(fake.start).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", { level: 2, name: copy.paymentTitle }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        /PayPal Sandbox checkout|Prepare a test order for the reviewed basket/,
      ),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.prepare }));
    await screen.findByText(copy.prepared);
    expect(fake.start).toHaveBeenCalledWith({
      requestId: props.requestId,
      revision: 0,
    });
    expect(screen.queryByText("ORDER1")).not.toBeInTheDocument();
    expect(screen.getByText(copy.unavailable)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /pay with paypal/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/payment confirmed|paid successfully/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.back })).toHaveAttribute(
      "href",
      `/family/requests/${props.requestId}`,
    );
  });
  it("guards double preparation and shows truthful pending feedback", async () => {
    let complete: (result: CheckoutResult) => void = () => {};
    fake.start.mockImplementation(
      () =>
        new Promise<CheckoutResult>((resolve) => {
          complete = resolve;
        }),
    );
    render(<CheckoutPanel {...props} />);
    const button = screen.getByRole("button", { name: copy.prepare });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fake.start).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(copy.prepared)).not.toBeInTheDocument();
    await act(async () => complete(preparedResult));
    expect(screen.getByText(copy.prepared)).toBeInTheDocument();
  });
  it("focuses a price conflict inline and retains an explicit retry action", async () => {
    fake.start.mockResolvedValue({
      ok: false,
      error: { code: "CONFLICT", message: copy.errors.PRICE_CHANGED },
    });
    render(<CheckoutPanel {...props} />);
    fireEvent.click(screen.getByRole("button", { name: copy.prepare }));
    const alert = await screen.findByRole("alert");
    await waitFor(() => expect(alert).toHaveFocus());
    expect(alert).toHaveTextContent(copy.errors.PRICE_CHANGED);
    expect(screen.getByRole("button", { name: copy.prepare })).toBeEnabled();
    expect(screen.queryByText("ORDER1")).not.toBeInTheDocument();
  });
  it("offers recovery for an order-less attempt without calling the action on mount", () => {
    render(
      <CheckoutPanel
        {...props}
        editable={false}
        checkout={{ ...prepared, orderId: null, state: "PREPARING" }}
      />,
    );
    expect(
      screen.getByRole("button", { name: copy.retry }),
    ).toBeInTheDocument();
    expect(fake.start).not.toHaveBeenCalled();
  });
  it("requires deliberate cancellation, focuses the safe choice, and restores focus on dismissal", async () => {
    render(
      <CheckoutPanel
        {...props}
        revision={1}
        editable={false}
        checkout={prepared}
      />,
    );
    const trigger = screen.getByRole("button", { name: copy.cancel });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: copy.cancelTitle });
    expect(
      within(dialog).getByRole("button", { name: copy.keep }),
    ).toHaveFocus();
    expect(fake.cancel).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: copy.keep }));
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: copy.confirmCancel }));
    await waitFor(() =>
      expect(fake.cancel).toHaveBeenCalledWith({
        requestId: props.requestId,
        revision: 1,
        paymentId: prepared.paymentId,
        confirmed: true,
      }),
    );
    await screen.findByText(copy.cancelled);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("keeps an uncertain cancellation locked and displays the provider error inline", async () => {
    fake.cancel.mockResolvedValue({
      ok: false,
      error: { code: "PAYMENT_PROVIDER_ERROR", message: copy.errors.PROVIDER },
    });
    render(<CheckoutPanel {...props} editable={false} checkout={prepared} />);
    fireEvent.click(screen.getByRole("button", { name: copy.cancel }));
    fireEvent.click(screen.getByRole("button", { name: copy.confirmCancel }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      copy.errors.PROVIDER,
    );
    expect(screen.getByText(copy.locked)).toBeInTheDocument();
    expect(screen.queryByText("ORDER1")).not.toBeInTheDocument();
  });
  it("reconciles action feedback with the next authoritative server revision", async () => {
    const { rerender } = render(<CheckoutPanel {...props} />);
    fireEvent.click(screen.getByRole("button", { name: copy.prepare }));
    await screen.findByText(copy.prepared);
    rerender(<CheckoutPanel {...props} revision={2} checkout={null} />);
    expect(screen.queryByText("ORDER1")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: copy.prepare }),
    ).toBeInTheDocument();
  });
  it("shows pending truthfully with authenticated manual refresh, never cancellation", async () => {
    render(
      <CheckoutPanel
        {...props}
        editable={false}
        checkout={{ ...prepared, state: "PENDING", canCancel: false }}
      />,
    );
    expect(screen.getByText(copy.statuses.PENDING)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: copy.cancel }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.refresh }));
    await waitFor(() =>
      expect(fake.refresh).toHaveBeenCalledWith({
        requestId: props.requestId,
        paypalOrderId: "ORDER1",
      }),
    );
  });
  it("renders verified confirmation without provider identifiers and keeps delivery separate", () => {
    render(
      <CheckoutPanel
        {...props}
        editable={false}
        checkout={{
          ...prepared,
          state: "CAPTURED",
          captureId: "CAPTURE1",
          capturedAt: "2026-10-12T00:00:00Z",
          canCancel: false,
        }}
      />,
    );
    expect(screen.getByText(copy.statuses.CAPTURED)).toBeInTheDocument();
    expect(screen.queryByText("CAPTURE1")).not.toBeInTheDocument();
    expect(screen.queryByText("ORDER1")).not.toBeInTheDocument();
    expect(screen.getByText(/\$5.00 · USD/)).toBeInTheDocument();
    expect(screen.getByText(copy.delivery)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: copy.cancel }),
    ).not.toBeInTheDocument();
  });
  it.each(["REFUNDED", "REVERSED"] as const)(
    "does not display current paid success for %s",
    (state) => {
      render(
        <CheckoutPanel
          {...props}
          editable={false}
          checkout={{
            ...prepared,
            state,
            captureId: "CAPTURE1",
            capturedAt: "2026-10-12T00:00:00Z",
          }}
        />,
      );
      expect(screen.getByText(copy.statuses[state])).toBeInTheDocument();
      expect(
        screen.queryByText(copy.statuses.CAPTURED),
      ).not.toBeInTheDocument();
      expect(screen.getByText(copy.historicalCapture)).toBeInTheDocument();
    },
  );
  it("lets fresh refund props replace a local result even when revision is unchanged", async () => {
    const { rerender } = render(
      <CheckoutPanel {...props} checkout={prepared} />,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.refresh }));
    await screen.findByText(copy.statuses.PENDING);
    rerender(
      <CheckoutPanel
        {...props}
        editable={false}
        checkout={{ ...prepared, state: "REFUNDED", captureId: "CAPTURE1" }}
      />,
    );
    expect(screen.getByText(copy.statuses.REFUNDED)).toBeInTheDocument();
    expect(screen.queryByText(copy.statuses.PENDING)).not.toBeInTheDocument();
  });
  it("shows the accepted receipt only after verified payment confirmation", async () => {
    fake.refresh.mockResolvedValue({
      ok: true,
      data: {
        ...prepared,
        state: "CAPTURED",
        captureId: "CAPTURE1",
        canCancel: false,
      },
		feedback: { kind: "success", message: copy.statuses.CAPTURED },
    });
    const { container } = render(
      <CheckoutPanel
        {...props}
        editable={false}
        checkout={{ ...prepared, state: "PENDING", canCancel: false }}
      />,
    );
    expect(container.querySelector('[class*="receiptGraphic"]')).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: copy.refresh }));
    const result = await screen.findByText(copy.statuses.CAPTURED);
    await waitFor(() => expect(result).toHaveFocus());
    expect(
      container.querySelector('[class*="successGraphic"][aria-hidden="true"]'),
    ).not.toBeNull();
    expect(screen.queryByText("CAPTURE1")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.back })).toHaveAttribute(
      "href",
      `/family/requests/${props.requestId}`,
    );
  });
  it("shows a declined receipt and a return path for a verified denial", async () => {
    fake.refresh.mockResolvedValue({
      ok: true,
      data: { ...prepared, state: "DENIED", canCancel: false },
		feedback: { kind: "error", message: copy.statuses.DENIED },
    });
    const { container } = render(
      <CheckoutPanel {...props} checkout={prepared} />,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.refresh }));
    const result = await screen.findByText(copy.statuses.DENIED);
    await waitFor(() => expect(result).toHaveFocus());
    expect(
      container.querySelector('[class*="failureGraphic"][aria-hidden="true"]'),
    ).not.toBeNull();
    expect(screen.queryByText(copy.statuses.CAPTURED)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.back })).toHaveAttribute(
      "href",
      `/family/requests/${props.requestId}`,
    );
  });
  it("does not turn transport failures into declined payments or no-charge claims", async () => {
    fake.refresh.mockRejectedValue(new Error("network unavailable"));
    const { container } = render(
      <CheckoutPanel
        {...props}
        editable={false}
        checkout={{ ...prepared, state: "PENDING", canCancel: false }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: copy.refresh }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      copy.errors.INTERNAL,
    );
    expect(screen.getByText(copy.statuses.PENDING)).toBeInTheDocument();
    expect(container.querySelector('[class*="failureGraphic"]')).toBeNull();
    expect(
      screen.queryByText(
        /you were not charged|payment failed|payment confirmed/i,
      ),
    ).not.toBeInTheDocument();
  });
  it("observes webhook state while visible, resumes on focus, and stops at final outcomes", async () => {
    vi.useFakeTimers();
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    const { rerender } = render(
      <CheckoutPanel
        {...props}
        editable={false}
        checkout={{ ...prepared, state: "PENDING", canCancel: false }}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(fake.pageRefresh).toHaveBeenCalledOnce();
    expect(fake.refresh).not.toHaveBeenCalled();
    expect(fake.capture).not.toHaveBeenCalled();
    visibility.mockReturnValue("hidden");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(fake.pageRefresh).toHaveBeenCalledOnce();
    visibility.mockReturnValue("visible");
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(fake.pageRefresh).toHaveBeenCalledTimes(2);
    rerender(
      <CheckoutPanel
        {...props}
        editable={false}
        checkout={{ ...prepared, state: "CAPTURED", canCancel: false }}
      />,
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40_000);
      window.dispatchEvent(new Event("focus"));
    });
    expect(fake.pageRefresh).toHaveBeenCalledTimes(2);
  });
});
