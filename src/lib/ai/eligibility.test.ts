// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getShoppingAiConfig } from "@/lib/env/server";
import { GEMINI_APPROVED_MODEL, GEMINI_DEPLOYMENT_APPROVAL } from "./eligibility";
describe("deployment-wide Gemini eligibility gate", () => {
	afterEach(() => vi.unstubAllEnvs());
	it("requires the reviewed deployment model in addition to valid environment configuration", () => {
		vi.stubEnv("GEMINI_SHOPPING_ENABLED", "true");
		vi.stubEnv("GEMINI_API_KEY", "fictional-key-for-unit-tests");
		vi.stubEnv("GEMINI_MODEL", "gemini-test");

		expect(GEMINI_DEPLOYMENT_APPROVAL).toBe("carebasket-adults-only-paid-tier-2026-10-12");
		expect(GEMINI_APPROVED_MODEL).toBe("gemini-3.8-flash");
		expect(getShoppingAiConfig()).toBeNull();
	});
	it("accepts the explicitly approved model when the deployment flag and key are valid", () => {
		vi.stubEnv("GEMINI_SHOPPING_ENABLED", "true");
		vi.stubEnv("GEMINI_API_KEY", "fictional-key-for-unit-tests");
		vi.stubEnv("GEMINI_MODEL", GEMINI_APPROVED_MODEL);

		expect(getShoppingAiConfig()).toEqual({
			apiKey: "fictional-key-for-unit-tests",
			model: GEMINI_APPROVED_MODEL,
		});
	});
	it("fails closed on a missing or malformed environment", () => {
		vi.stubEnv("GEMINI_SHOPPING_ENABLED", "yes"); vi.stubEnv("GEMINI_API_KEY", ""); vi.stubEnv("GEMINI_MODEL", "");
		expect(getShoppingAiConfig()).toBeNull();
	});
});
