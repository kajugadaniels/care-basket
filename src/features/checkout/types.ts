import type { ActionResult } from "@/types/action-result";

// Manager-only DTO: minimal verified references, never provider payloads or payer data.
export type CheckoutDto = {
	paymentId: string;
	orderId: string | null;
	state: "PREPARING" | "PREPARED" | "REVIEW_REQUIRED" | "APPROVED" | "PENDING" | "CAPTURED" | "DENIED" | "REFUNDED" | "REVERSED";
	amount: string;
	buyerApprovalEnabled: boolean;
	clientId?: string;
	captureId?: string | null;
	capturedAt?: string | null;
	canCancel?: boolean;
};
export type CheckoutResult = ActionResult<CheckoutDto>;
export type CancelCheckoutResult = ActionResult<{ requestId: string }>;
