// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getShoppingAiConfig } from "@/lib/env/server";
import { GEMINI_APPROVED_MODEL, GEMINI_DEPLOYMENT_APPROVAL } from "./eligibility";
describe("deployment-wide Gemini eligibility gate", () => {
	afterEach(() => vi.unstubAllEnvs());
	it("does not treat a true environment flag and syntactically valid configuration as approval", () => {
		vi.stubEnv("GEMINI_SHOPPING_ENABLED", "true"); vi.stubEnv("GEMINI_API_KEY", "fictional-key-for-unit-tests"); vi.stubEnv("GEMINI_MODEL", "gemini-test");
		expect(GEMINI_DEPLOYMENT_APPROVAL).toBeNull(); expect(GEMINI_APPROVED_MODEL).toBeNull(); expect(getShoppingAiConfig()).toBeNull();
	});
	it("fails closed on a missing or malformed environment", () => {
		vi.stubEnv("GEMINI_SHOPPING_ENABLED", "yes"); vi.stubEnv("GEMINI_API_KEY", ""); vi.stubEnv("GEMINI_MODEL", "");
		expect(getShoppingAiConfig()).toBeNull();
	});
});
