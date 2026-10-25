import "server-only";
import type { AppErrorCode } from "@/types/action-result";

// Narrow allow-list: callers cannot attach raw exceptions, cookies, codes, or names.
export function logSecurityFailure(input: {
	event: string; requestId: string; actorType: "ADULT" | "DEVICE" | "SYSTEM";
	code: AppErrorCode;
}) {
	console.error(JSON.stringify({ event: input.event, requestId: input.requestId,
		actorType: input.actorType, code: input.code }));
}

export type OperationalLogEvent =
	| {
		event: "assistant.provider";
		outcome: "SUCCESS" | "UNAVAILABLE" | "OUTPUT_INVALID";
		model: string;
		durationBucket: "UNDER_1S" | "1_TO_5S" | "5_TO_15S" | "OVER_15S";
		tokenBucket?: "UNDER_1K" | "1K_TO_4K" | "OVER_4K";
	}
	| {
		event: "assistant.interpretation";
		outcome: "PROVIDER_SUCCESS" | "LOCAL_ONLY" | "FALLBACK" | "REJECTED";
		inputMode: "TEXT" | "VOICE";
		reason?: "PROVIDER_UNAVAILABLE" | "OUTPUT_INVALID" | "RATE_LIMITED" | "CONSENT_CHANGED" | "EMPTY_AUDIO";
	};

/**
 * Records allowlisted operational dimensions only. Explicit reconstruction keeps
 * additional runtime properties from reaching hosting-provider logs.
 */
export function logOperationalEvent(input: OperationalLogEvent) {
	try {
		const shared = { event: input.event, eventId: crypto.randomUUID(), actorType: "SYSTEM" } as const;
		const entry = input.event === "assistant.provider"
			? { ...shared, outcome: input.outcome, model: input.model, durationBucket: input.durationBucket,
				...(input.tokenBucket ? { tokenBucket: input.tokenBucket } : {}) }
			: { ...shared, outcome: input.outcome, inputMode: input.inputMode,
				...(input.reason ? { reason: input.reason } : {}) };
		console.info(JSON.stringify(entry));
	} catch {
		// Observability is best effort and must never break a shopping request.
	}
}
