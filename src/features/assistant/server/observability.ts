import "server-only";
import type { AiProviderMetric } from "@/lib/ai/provider";
import { logOperationalEvent } from "@/server/logger";

export type ShoppingInterpretationReason =
	| "PROVIDER_UNAVAILABLE"
	| "OUTPUT_INVALID"
	| "RATE_LIMITED"
	| "CONSENT_CHANGED"
	| "EMPTY_AUDIO";

export type ShoppingInterpretationMetric =
	| { inputMode: "TEXT" | "VOICE"; outcome: "PROVIDER_SUCCESS" | "LOCAL_ONLY" }
	| { inputMode: "TEXT" | "VOICE"; outcome: "FALLBACK" | "REJECTED"; reason: ShoppingInterpretationReason };

function safeModel(model: string): string {
	return /^[A-Za-z0-9._-]{1,80}$/.test(model) ? model : "unknown";
}

function durationBucket(durationMs: number) {
	if (durationMs < 1_000) return "UNDER_1S" as const;
	if (durationMs < 5_000) return "1_TO_5S" as const;
	if (durationMs < 15_000) return "5_TO_15S" as const;
	return "OVER_15S" as const;
}

function tokenBucket(tokens: number | undefined) {
	if (typeof tokens !== "number" || !Number.isSafeInteger(tokens) || tokens < 0) return undefined;
	if (tokens < 1_000) return "UNDER_1K" as const;
	if (tokens < 4_000) return "1K_TO_4K" as const;
	return "OVER_4K" as const;
}

export function logShoppingProviderMetric(metric: AiProviderMetric) {
	const tokens = tokenBucket(metric.tokens);
	logOperationalEvent({
		event: "assistant.provider",
		outcome: metric.outcome,
		model: safeModel(metric.model),
		durationBucket: durationBucket(Math.max(0, metric.durationMs)),
		...(metric.reason ? { reason: metric.reason } : {}),
		...(tokens ? { tokenBucket: tokens } : {}),
	});
}

export function logShoppingInterpretationMetric(metric: ShoppingInterpretationMetric) {
	if (metric.outcome === "FALLBACK" || metric.outcome === "REJECTED") {
		logOperationalEvent({ event: "assistant.interpretation", inputMode: metric.inputMode,
			outcome: metric.outcome, reason: metric.reason });
		return;
	}

	logOperationalEvent({ event: "assistant.interpretation", inputMode: metric.inputMode, outcome: metric.outcome });
}
