"use client";

import type { ComponentProps } from "react";
import { PayPalOneTimePaymentButton, PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";

type OfficialButtonProps = ComponentProps<typeof PayPalOneTimePaymentButton>;
type Props = {
	clientId: string;
	environment: "sandbox";
	buyerApprovalEnabled: boolean;
	createOrder: () => Promise<{ orderId: string }>;
	// Required: approval must await the authenticated, verified capture action.
	onApprove: NonNullable<OfficialButtonProps["onApprove"]>;
	onCancel: NonNullable<OfficialButtonProps["onCancel"]>;
	onError: NonNullable<OfficialButtonProps["onError"]>;
};

export function PayPalCheckoutButton(props: Props) {
	if (!props.buyerApprovalEnabled || props.environment !== "sandbox") return null;
	return <PayPalProvider clientId={props.clientId} environment="sandbox" components={["paypal-payments"]} pageType="checkout">
		<PayPalOneTimePaymentButton createOrder={props.createOrder} onApprove={props.onApprove}
			onCancel={props.onCancel} onError={props.onError} />
	</PayPalProvider>;
}
