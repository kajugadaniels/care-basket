import type { PaymentAttempt } from "@/features/checkout/server/persistence";
import { requestIds, requestNow } from "./requests";

export function paymentAttempt(overrides: Partial<PaymentAttempt> = {}): PaymentAttempt {
	return { id: requestIds.key, familyId: requestIds.family, requestId: requestIds.request, basketId: requestIds.basket,
		status: "CREATED", amountMinor: 500, currency: "USD", paypalOrderId: "ORDER1", paypalCaptureId: null,
		paypalClientId: "fictional-sandbox-client", orderItems: [{ sku: "demo-milk", name: "Milk", quantity: 2, unitPriceMinor: 250 }],
		capturedAt: null, creationStartedAt: requestNow, captureStartedAt: null, operationToken: null, operationExpiresAt: null,
		...overrides };
}

export function paymentOrder(payment = paymentAttempt(), captureStatus = "COMPLETED") {
	return { id: payment.paypalOrderId, intent: "CAPTURE", status: captureStatus === "PENDING" ? "APPROVED" : "COMPLETED",
		payer: { email_address: "never-persist@example.invalid" },
		purchase_units: [{ reference_id: payment.basketId, custom_id: payment.id,
			amount: { currency_code: "USD", value: "5.00" }, payments: { captures: [{
				id: "CAPTURE1", status: captureStatus, final_capture: true, amount: { currency_code: "USD", value: "5.00" },
				create_time: requestNow.toISOString(),
			}] } }],
	};
}

export function approvedOrder(payment = paymentAttempt()) {
	const order = paymentOrder(payment);
	order.status = "APPROVED";
	order.purchase_units[0].payments.captures = [];
	return order;
}
