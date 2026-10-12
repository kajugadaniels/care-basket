import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ provider: vi.fn(), button: vi.fn() }));
vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({ PayPalProvider: sdk.provider, PayPalOneTimePaymentButton: sdk.button }));
import { PayPalCheckoutButton } from "./PayPalCheckoutButton";

describe("official SDK v6 verified-capture integration", () => {
	beforeEach(() => {
		vi.resetAllMocks(); sdk.provider.mockImplementation(({ children }: { children: ReactNode }) => children);
		sdk.button.mockReturnValue(null);
	});
	it("never mounts approval while the server gate is disabled", () => {
		const createOrder = vi.fn(); const onApprove = vi.fn();
		const { container } = render(<PayPalCheckoutButton clientId="fictional-public-client" environment="sandbox"
			buyerApprovalEnabled={false} createOrder={createOrder} onApprove={onApprove} onCancel={vi.fn()} onError={vi.fn()} />);
		expect(container).toBeEmptyDOMElement();
		expect(sdk.provider).not.toHaveBeenCalled(); expect(sdk.button).not.toHaveBeenCalled();
		expect(createOrder).not.toHaveBeenCalled(); expect(onApprove).not.toHaveBeenCalled();
	});
	it("mounts the official Sandbox provider and forwards real callbacks without invoking them", () => {
		const createOrder = vi.fn(); const onApprove = vi.fn();
		render(<PayPalCheckoutButton clientId="fictional-public-client" environment="sandbox" buyerApprovalEnabled
			createOrder={createOrder} onApprove={onApprove} onCancel={vi.fn()} onError={vi.fn()} />);
		expect(sdk.provider.mock.calls[0][0]).toMatchObject({ clientId: "fictional-public-client", environment: "sandbox", components: ["paypal-payments"] });
		expect(sdk.button.mock.calls[0][0]).toMatchObject({ createOrder, onApprove });
		expect(createOrder).not.toHaveBeenCalled(); expect(onApprove).not.toHaveBeenCalled();
	});
});
