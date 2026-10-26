"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { captureCheckoutAction, startCheckoutAction } from "../../actions";
import { checkoutCopy as copy } from "../../copy";
import type { CheckoutDto } from "../../types";
import type { ActionFeedback } from "@/types/action-result";

// SDK code is fetched only for a deliberately prepared, server-enabled manager checkout.
const PayPalCheckoutButton = dynamic(() => import("./PayPalCheckoutButton").then((module) => module.PayPalCheckoutButton), { ssr: false });

export function BuyerApproval({ requestId, revision, checkout, onResult, onFeedback, onError }: {
	requestId: string; revision: number; checkout: CheckoutDto;
	onResult: (result: CheckoutDto, feedback: ActionFeedback) => void;
	onFeedback: (feedback: ActionFeedback) => void;
	onError: (message: string) => void;
}) {
	const busy = useRef(false);
	const [pending, setPending] = useState(false);
	if (!checkout.buyerApprovalEnabled || !checkout.clientId || !["PREPARED", "APPROVED"].includes(checkout.state)) return null;
	return <>
		<PayPalCheckoutButton clientId={checkout.clientId} environment="sandbox" buyerApprovalEnabled
			createOrder={async () => {
				if (busy.current) throw new Error(copy.busy);
				const result = await startCheckoutAction({ requestId, revision });
				if (!result.ok || !result.data.orderId || !result.data.buyerApprovalEnabled) {
					onError(result.ok ? copy.errors.UNKNOWN : result.error.message);
					throw new Error(copy.errors.UNKNOWN);
				}
				onFeedback(result.feedback);
				return { orderId: result.data.orderId };
			}}
			onApprove={async ({ orderId }) => {
				if (busy.current) { onError(copy.busy); return; }
				busy.current = true;
				setPending(true);
				try {
					const result = await captureCheckoutAction({ requestId, paypalOrderId: orderId });
					if (result.ok) onResult(result.data, result.feedback);
					else onError(result.error.message);
				} catch { onError(copy.errors.UNKNOWN); }
				finally { busy.current = false; setPending(false); }
			}}
			onCancel={() => onError(copy.popupClosed)} onError={() => onError(copy.errors.UNKNOWN)} />
		{pending ? <p role="status">{copy.paying}</p> : null}
	</>;
}
