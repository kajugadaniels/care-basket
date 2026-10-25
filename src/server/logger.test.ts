// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { OperationalLogEvent } from "./logger";
import { logOperationalEvent } from "./logger";

describe("operational logging", () => {
	afterEach(() => vi.restoreAllMocks());

	it("writes only allowlisted provider dimensions", () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const input = {
			event: "assistant.provider",
			outcome: "SUCCESS",
			model: "gemini-test",
			durationBucket: "1_TO_5S",
			tokenBucket: "UNDER_1K",
			requestText: "private grocery words",
			audio: "private audio",
			familyId: "private family",
		} as OperationalLogEvent & Record<string, string>;

		logOperationalEvent(input);

		const logged = String(info.mock.calls[0][0]);
		expect(JSON.parse(logged)).toEqual({
			event: "assistant.provider",
			eventId: expect.stringMatching(/^[0-9a-f-]{36}$/),
			actorType: "SYSTEM",
			outcome: "SUCCESS",
			model: "gemini-test",
			durationBucket: "1_TO_5S",
			tokenBucket: "UNDER_1K",
		});
		expect(logged).not.toContain("private");
	});

	it("does not let a logging failure interrupt the request", () => {
		vi.spyOn(console, "info").mockImplementation(() => { throw new Error("logging unavailable"); });

		expect(() => logOperationalEvent({
			event: "assistant.interpretation",
			outcome: "FALLBACK",
			inputMode: "TEXT",
			reason: "PROVIDER_UNAVAILABLE",
		})).not.toThrow();
	});

	it("logs a coarse provider reason without accepting provider details", () => {
		const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
		const input = {
			event: "assistant.provider",
			outcome: "UNAVAILABLE",
			model: "gemini-test",
			durationBucket: "OVER_15S",
			reason: "TIMEOUT",
			providerMessage: "private provider response",
		} as OperationalLogEvent & Record<string, string>;

		logOperationalEvent(input);

		const logged = String(info.mock.calls[0][0]);
		expect(JSON.parse(logged)).toMatchObject({ outcome: "UNAVAILABLE", reason: "TIMEOUT" });
		expect(logged).not.toContain("private provider response");
	});
});
