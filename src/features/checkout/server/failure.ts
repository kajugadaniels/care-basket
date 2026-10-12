import "server-only";
import { AppError } from "@/server/errors";

export type CheckoutReason = "CONFIGURATION" | "PRICE_CHANGED" | "UNAVAILABLE_PRODUCT" | "IN_PROGRESS"
	| "RECONCILIATION" | "PROVIDER" | "REJECTED";
export class CheckoutFailure extends AppError {
	constructor(readonly reason: CheckoutReason) {
		super(["PRICE_CHANGED", "UNAVAILABLE_PRODUCT", "IN_PROGRESS", "RECONCILIATION"].includes(reason)
			? "CONFLICT" : "PAYMENT_PROVIDER_ERROR");
	}
}
