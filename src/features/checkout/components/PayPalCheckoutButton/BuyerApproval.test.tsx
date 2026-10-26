import { act, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckoutDto, CheckoutResult } from "../../types";
import { checkoutCopy as copy } from "../../copy";
import type { PayPalCheckoutButton } from "./PayPalCheckoutButton";
import { requestIds } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ start: vi.fn(), capture: vi.fn(), button: vi.fn() }));
vi.mock("../../actions", () => ({ startCheckoutAction: fake.start, captureCheckoutAction: fake.capture }));
vi.mock("next/dynamic", () => ({ default: () => fake.button }));
import { BuyerApproval } from "./BuyerApproval";

const checkout: CheckoutDto = { paymentId: requestIds.key, orderId: "ORDER1", state: "PREPARED", amount: "$5.00",
	buyerApprovalEnabled: true, clientId: "fictional-public-client" };
const preparedFeedback = { kind: "success" as const, message: copy.statuses.PREPARED };
function callbacks() { return fake.button.mock.calls[0][0] as ComponentProps<typeof PayPalCheckoutButton>; }

describe("SDK callbacks await verified server results", () => {
	beforeEach(() => { vi.resetAllMocks(); fake.button.mockReturnValue(null); fake.start.mockResolvedValue({ ok: true, data: checkout, feedback: preparedFeedback }); });
	it("creates/reuses orders through the authenticated action without amounts", async () => {
		render(<BuyerApproval requestId={requestIds.request} revision={1} checkout={checkout} onResult={vi.fn()} onFeedback={vi.fn()} onError={vi.fn()} />);
		expect(await callbacks().createOrder()).toEqual({ orderId: "ORDER1" });
		expect(fake.start).toHaveBeenCalledWith({ requestId: requestIds.request, revision: 1 });
	});
	it("awaits capture with the SDK order ID and never reports success just from approval", async () => {
		let complete: (result: CheckoutResult) => void = () => {};
		fake.capture.mockImplementation(() => new Promise<CheckoutResult>((resolve) => { complete = resolve; }));
		const onResult = vi.fn();
		render(<BuyerApproval requestId={requestIds.request} revision={1} checkout={checkout} onResult={onResult} onFeedback={vi.fn()} onError={vi.fn()} />);
		let approval: Promise<void> | undefined;
		act(() => { approval = callbacks().onApprove({ orderId: "SDKORDER1", fundingSource: "paypal" }); });
		expect(fake.capture).toHaveBeenCalledWith({ requestId: requestIds.request, paypalOrderId: "SDKORDER1" });
		expect(onResult).not.toHaveBeenCalled();
		expect(screen.getByRole("status")).toHaveTextContent("Confirming payment");
		const capturedFeedback = { kind: "success" as const, message: copy.statuses.CAPTURED };
		await act(async () => { complete({ ok: true, data: { ...checkout, state: "CAPTURED", buyerApprovalEnabled: false }, feedback: capturedFeedback }); await approval; });
		expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ state: "CAPTURED" }), capturedFeedback);
	});
	it("popup cancellation and SDK errors cannot cancel or mark the payment paid", async () => {
		const onResult = vi.fn(); const onError = vi.fn();
		render(<BuyerApproval requestId={requestIds.request} revision={1} checkout={checkout} onResult={onResult} onFeedback={vi.fn()} onError={onError} />);
		callbacks().onCancel({ orderId: "ORDER1" });
		expect(onError).toHaveBeenCalled(); expect(onResult).not.toHaveBeenCalled(); expect(fake.capture).not.toHaveBeenCalled();
	});
	it("rejects duplicate approval callbacks while the original promise is pending", async () => {
		let complete: (result: CheckoutResult) => void = () => {};
		fake.capture.mockImplementation(() => new Promise<CheckoutResult>((resolve) => { complete = resolve; }));
		const onError = vi.fn();
		render(<BuyerApproval requestId={requestIds.request} revision={1} checkout={checkout} onResult={vi.fn()} onFeedback={vi.fn()} onError={onError} />);
		let first: Promise<void> | undefined;
		act(() => { first = callbacks().onApprove({ orderId: "ORDER1", fundingSource: "paypal" }); });
		await act(async () => { await callbacks().onApprove({ orderId: "ORDER1", fundingSource: "paypal" }); });
		expect(fake.capture).toHaveBeenCalledOnce(); expect(onError).toHaveBeenCalledWith(copy.busy);
		await act(async () => { complete({
			ok: true,
			data: { ...checkout, state: "PENDING", buyerApprovalEnabled: false },
			feedback: { kind: "warning", message: copy.statuses.PENDING },
		}); await first; });
	});
	it("surfaces safe capture errors without announcing payment success", async () => {
		fake.capture.mockResolvedValue({ ok: false, error: { code: "PAYMENT_PROVIDER_ERROR", message: "Payment status is not confirmed." } });
		const onResult = vi.fn(); const onError = vi.fn();
		render(<BuyerApproval requestId={requestIds.request} revision={1} checkout={checkout} onResult={onResult} onFeedback={vi.fn()} onError={onError} />);
		await act(async () => { await callbacks().onApprove({ orderId: "ORDER1", fundingSource: "paypal" }); });
		await waitFor(() => expect(onError).toHaveBeenCalledWith("Payment status is not confirmed."));
		expect(onResult).not.toHaveBeenCalled();
	});
});
