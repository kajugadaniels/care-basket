import type { ActionResult } from "@/types/action-result";

// Manager-only DTO: no provider payloads, tokens, capture data, or approval URLs.
export type CheckoutDto = {
	paymentId: string;
	orderId: string | null;
	state: "PREPARING" | "PREPARED" | "REVIEW_REQUIRED";
	amount: string;
	buyerApprovalEnabled: false;
};
export type CheckoutResult = ActionResult<CheckoutDto>;
export type CancelCheckoutResult = ActionResult<{ requestId: string }>;
