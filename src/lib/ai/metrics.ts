import "server-only";
import { randomUUID } from "node:crypto";

// Explicit fields only: never accept the SDK response, user text, identifiers or audio here.
export function logShoppingAiMetric(model: string, started: number, outcome: "ok" | "AI_UNAVAILABLE", tokens?: number) {
	console.info(JSON.stringify({ operation: "shopping.interpret", model, durationMs: Math.max(0, Date.now() - started),
		outcome, requestId: randomUUID(), ...(typeof tokens === "number" && Number.isSafeInteger(tokens) && tokens >= 0 ? { tokens } : {}) }));
}
