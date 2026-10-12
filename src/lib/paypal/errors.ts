import "server-only";

export type PayPalFailureKind = "CONFIGURATION" | "AUTHENTICATION" | "REJECTED" | "UNAVAILABLE" | "INVALID_RESPONSE";

// No provider body, headers, credential values, or payer information is retained.
export class PayPalError extends Error {
	constructor(readonly kind: PayPalFailureKind, readonly outcome: "NOT_CREATED" | "UNKNOWN" = "UNKNOWN",
		readonly issue?: "INSTRUMENT_DECLINED" | "ORDER_ALREADY_CAPTURED") {
		super(`PayPal Sandbox ${kind.toLowerCase()}.`);
		this.name = "PayPalError";
	}
}
