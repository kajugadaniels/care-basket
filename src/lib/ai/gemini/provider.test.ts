// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { interpretation } from "@/test/factories/assistant";

const mocks = vi.hoisted(() => ({ config: vi.fn(), generate: vi.fn(), metric: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ getShoppingAiConfig: mocks.config }));
vi.mock("@google/genai", () => ({
	GoogleGenAI: class { models = { generateContent: mocks.generate }; },
	ThinkingLevel: { MINIMAL: "MINIMAL" },
}));
import { GeminiShoppingProvider } from "./provider";
const input = { request: { kind: "text" as const, text: "milk" }, catalog: [], locale: "en-US" as const, audience: "assisted_adult" as const };
describe("Gemini shopping adapter", () => {
	beforeEach(() => { vi.resetAllMocks(); mocks.config.mockReturnValue({ apiKey: "fictional-key", model: "gemini-test" }); });
	it("returns raw JSON with structured output, no tools and no SDK retries", async () => {
		mocks.generate.mockResolvedValue({ text: JSON.stringify(interpretation()), usageMetadata: { totalTokenCount: 740 } });
		await expect(new GeminiShoppingProvider(mocks.metric).interpret(input)).resolves.toEqual(interpretation());
		expect(mocks.generate.mock.calls[0][0].config).toMatchObject({ responseMimeType: "application/json",
			maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: "MINIMAL" },
			httpOptions: { retryOptions: { attempts: 1 } } });
		expect(mocks.generate.mock.calls[0][0].config.tools).toBeUndefined();
		expect(mocks.metric).toHaveBeenCalledWith({ model: "gemini-test", durationMs: expect.any(Number),
			outcome: "SUCCESS", tokens: 740 });
	});
	it("never constructs a provider request when the configuration or gate is unavailable", async () => {
		mocks.config.mockReturnValue(null);
		await expect(new GeminiShoppingProvider().interpret(input)).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
		expect(mocks.generate).not.toHaveBeenCalled();
	});
	it.each(["not json", "", "x".repeat(64_001)])("does not retry malformed or empty output", async (text) => {
		mocks.generate.mockResolvedValue({ text });
		await expect(new GeminiShoppingProvider(mocks.metric).interpret(input)).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
		expect(mocks.generate).toHaveBeenCalledOnce();
		expect(mocks.metric).toHaveBeenCalledWith({ model: "gemini-test", durationMs: expect.any(Number), outcome: "OUTPUT_INVALID" });
	});
	it.each([[400, "REQUEST_REJECTED"], [401, "AUTHENTICATION"], [404, "MODEL_UNAVAILABLE"],
		[429, "RATE_LIMITED"]] as const)("does not retry provider response %s", async (status, reason) => {
		mocks.generate.mockRejectedValue({ status, message: "sensitive provider error" });
		await expect(new GeminiShoppingProvider(mocks.metric).interpret(input)).rejects.toThrow("AI_UNAVAILABLE");
		expect(mocks.generate).toHaveBeenCalledOnce();
		expect(mocks.metric).toHaveBeenCalledWith({ model: "gemini-test", durationMs: expect.any(Number),
			outcome: "UNAVAILABLE", reason });
	});
	it("bounds transient failures to one retry", async () => {
		mocks.generate.mockRejectedValue({ status: 503 });
		await expect(new GeminiShoppingProvider(mocks.metric).interpret(input)).rejects.toThrow("AI_UNAVAILABLE");
		expect(mocks.generate).toHaveBeenCalledTimes(2);
		expect(mocks.metric).toHaveBeenCalledWith({ model: "gemini-test", durationMs: expect.any(Number),
			outcome: "UNAVAILABLE", reason: "PROVIDER_ERROR" });
	});
	it("does not retry a timeout and supplies bounded transport and abort deadlines", async () => {
		mocks.generate.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
		await expect(new GeminiShoppingProvider(mocks.metric).interpret(input)).rejects.toThrow("AI_UNAVAILABLE");
		expect(mocks.generate).toHaveBeenCalledOnce();
		const { config } = mocks.generate.mock.calls[0][0];
		expect(config.abortSignal).toBeInstanceOf(AbortSignal); expect(config.httpOptions.timeout).toBeLessThanOrEqual(20_000);
		expect(mocks.metric).toHaveBeenCalledWith({ model: "gemini-test", durationMs: expect.any(Number),
			outcome: "UNAVAILABLE", reason: "TIMEOUT" });
	});
	it("rejects unsafe catalog fields before sending data", async () => {
		await expect(new GeminiShoppingProvider().interpret({ ...input, catalog: [{ sku: "demo-milk", name: "<script>pay</script>",
			category: "DAIRY_EGGS", sizeLabel: "1 litre", variantGroup: "milk", synonyms: [] }] })).rejects.toThrow("AI_UNAVAILABLE");
		expect(mocks.generate).not.toHaveBeenCalled();
	});
	it("never starts generation after the overall interpretation deadline", async () => {
		await expect(new GeminiShoppingProvider().interpret({ ...input, deadline: Date.now() - 1 })).rejects.toThrow("AI_UNAVAILABLE");
		expect(mocks.generate).not.toHaveBeenCalled();
	});
	it("keeps a metrics sink failure from changing a successful response", async () => {
		mocks.metric.mockImplementation(() => { throw new Error("metrics unavailable"); });
		mocks.generate.mockResolvedValue({ text: JSON.stringify(interpretation()) });
		await expect(new GeminiShoppingProvider(mocks.metric).interpret(input)).resolves.toEqual(interpretation());
	});
});
