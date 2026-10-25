// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const log = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/server/logger", () => ({ logOperationalEvent: log }));

import { logShoppingInterpretationMetric, logShoppingProviderMetric } from "./observability";

describe("shopping assistant observability", () => {
	beforeEach(() => vi.resetAllMocks());

	it.each([
		[999, "UNDER_1S"],
		[1_000, "1_TO_5S"],
		[5_000, "5_TO_15S"],
		[15_000, "OVER_15S"],
	] as const)("buckets provider duration %sms as %s", (durationMs, durationBucket) => {
		logShoppingProviderMetric({ model: "gemini-test", durationMs, outcome: "SUCCESS", tokens: 999 });
		expect(log).toHaveBeenCalledWith({
			event: "assistant.provider",
			outcome: "SUCCESS",
			model: "gemini-test",
			durationBucket,
			tokenBucket: "UNDER_1K",
		});
	});

	it("normalizes unsafe model labels and omits invalid token counts", () => {
		logShoppingProviderMetric({
			model: "private\nrequest text",
			durationMs: -1,
			outcome: "OUTPUT_INVALID",
			tokens: Number.NaN,
		});
		expect(log).toHaveBeenCalledWith({
			event: "assistant.provider",
			outcome: "OUTPUT_INVALID",
			model: "unknown",
			durationBucket: "UNDER_1S",
		});
	});

	it("records only an allowlisted provider failure category", () => {
		logShoppingProviderMetric({
			model: "gemini-test",
			durationMs: 20_000,
			outcome: "UNAVAILABLE",
			reason: "TIMEOUT",
		});
		expect(log).toHaveBeenCalledWith({
			event: "assistant.provider",
			outcome: "UNAVAILABLE",
			model: "gemini-test",
			durationBucket: "OVER_15S",
			reason: "TIMEOUT",
		});
	});

	it("records only coarse interpretation outcomes", () => {
		logShoppingInterpretationMetric({ inputMode: "TEXT", outcome: "FALLBACK", reason: "RATE_LIMITED" });
		expect(log).toHaveBeenCalledWith({
			event: "assistant.interpretation",
			inputMode: "TEXT",
			outcome: "FALLBACK",
			reason: "RATE_LIMITED",
		});
	});
});
