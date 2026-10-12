import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ provider: vi.fn(), button: vi.fn() }));
vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({ PayPalProvider: sdk.provider, PayPalOneTimePaymentButton: sdk.button }));
import { PayPalCheckoutButton } from "./PayPalCheckoutButton";

describe("official SDK v6 source foundation", () => {
	beforeEach(() => vi.resetAllMocks());
	it.each([false, true])("never mounts approval before verified capture exists, even if a flag is %s", (buyerApprovalEnabled) => {
		const createOrder = vi.fn(); const onApprove = vi.fn();
		const { container } = render(<PayPalCheckoutButton clientId="fictional-public-client" environment="sandbox"
			buyerApprovalEnabled={buyerApprovalEnabled} createOrder={createOrder} onApprove={onApprove} onCancel={vi.fn()} onError={vi.fn()} />);
		expect(container).toBeEmptyDOMElement();
		expect(sdk.provider).not.toHaveBeenCalled(); expect(sdk.button).not.toHaveBeenCalled();
		expect(createOrder).not.toHaveBeenCalled(); expect(onApprove).not.toHaveBeenCalled();
	});
});
