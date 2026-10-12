"use client";

import type { ComponentProps } from "react";
import { PayPalOneTimePaymentButton, PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";

type OfficialButtonProps = ComponentProps<typeof PayPalOneTimePaymentButton>;
type Props = {
	clientId: string;
	environment: "sandbox";
	buyerApprovalEnabled: boolean;
	createOrder: () => Promise<{ orderId: string }>;
	// Required, never a dummy callback. Step 10 must provide verified server capture.
	onApprove: NonNullable<OfficialButtonProps["onApprove"]>;
	onCancel: NonNullable<OfficialButtonProps["onCancel"]>;
	onError: NonNullable<OfficialButtonProps["onError"]>;
};

// Source foundation only; intentionally not imported by any application route.
// Step 10 must implement capture before deliberately changing this source gate.
const VERIFIED_CAPTURE_IMPLEMENTED = false;

export function PayPalCheckoutButton(props: Props) {
	if (!VERIFIED_CAPTURE_IMPLEMENTED || !props.buyerApprovalEnabled || props.environment !== "sandbox") return null;
	return <PayPalProvider clientId={props.clientId} environment="sandbox" components={["paypal-payments"]} pageType="checkout">
		<PayPalOneTimePaymentButton createOrder={props.createOrder} onApprove={props.onApprove}
			onCancel={props.onCancel} onError={props.onError} />
	</PayPalProvider>;
}
