import "server-only";
import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { z } from "zod";
import { getShoppingAiConfig } from "@/lib/env/server";
import { AppError } from "@/server/errors";
import { shoppingResponseJsonSchema } from "../response-schema";
import { catalogContextSchema } from "../catalog-context";
import { SHOPPING_INSTRUCTION } from "../prompts";
import type { AiProviderFailureReason, AiProviderMetric, AiProviderMetricSink, InterpretInput,
	ShoppingAssistantProvider } from "../provider";

class InvalidProviderOutput extends Error {}

function failureReason(error: unknown): AiProviderFailureReason {
	if (error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name)) return "TIMEOUT";
	const status = typeof error === "object" && error !== null && "status" in error ? error.status : null;
	if (status === 401 || status === 403) return "AUTHENTICATION";
	if (status === 404) return "MODEL_UNAVAILABLE";
	if (status === 408 || status === 504) return "TIMEOUT";
	if (status === 429) return "RATE_LIMITED";
	if (typeof status === "number" && status >= 400 && status < 500) return "REQUEST_REJECTED";
	if (error instanceof TypeError) return "NETWORK";
	return "PROVIDER_ERROR";
}

export class GeminiShoppingProvider implements ShoppingAssistantProvider {
	constructor(private readonly onMetric: AiProviderMetricSink = () => undefined) {}

	private record(metric: AiProviderMetric) {
		try {
			this.onMetric(metric);
		} catch {
			// A metrics sink is best effort and cannot change provider behavior.
		}
	}

	async interpret(input: InterpretInput): Promise<unknown> {
		const config = getShoppingAiConfig();
		if (!config || input.audience !== "assisted_adult") throw new AppError("AI_UNAVAILABLE");
		const started = Date.now();
		const context = z.array(catalogContextSchema).max(200).safeParse(input.catalog);
		if (!context.success) {
			this.record({ model: config.model, durationMs: Date.now() - started, outcome: "OUTPUT_INVALID" });
			throw new AppError("AI_UNAVAILABLE");
		}
		const client = new GoogleGenAI({ apiKey: config.apiKey });
		const parts: Part[] = [{ text: JSON.stringify({ catalogData: context.data, locale: input.locale,
			requestData: input.request.kind === "text" ? input.request.text : "Interpret the attached audio." }) }];
		if (input.request.kind === "audio") parts.push({ inlineData: {
			mimeType: input.request.mimeType === "audio/mp4" ? "audio/m4a" : input.request.mimeType,
			data: Buffer.from(input.request.audio).toString("base64"),
		} });
		const deadline = Math.min(input.deadline ?? Date.now() + 25_000, Date.now() + 25_000);
		for (let attempt = 0; attempt < 2; attempt++) {
			try {
				const remaining = deadline - Date.now();
				if (remaining <= 0) throw new DOMException("Provider deadline exceeded", "TimeoutError");
				const response = await client.models.generateContent({ model: config.model, contents: [{ role: "user", parts }],
					config: { systemInstruction: SHOPPING_INSTRUCTION, temperature: 0.1, maxOutputTokens: 4096,
						thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
						responseMimeType: "application/json", responseJsonSchema: shoppingResponseJsonSchema(),
						abortSignal: AbortSignal.timeout(Math.min(20_000, remaining)),
						httpOptions: { timeout: Math.min(20_000, remaining), retryOptions: { attempts: 1 } } } });
				if (!response.text || response.text.length > 64_000) throw new InvalidProviderOutput();
				let raw: unknown;
				try {
					raw = JSON.parse(response.text);
				} catch {
					throw new InvalidProviderOutput();
				}
				this.record({ model: config.model, durationMs: Date.now() - started, outcome: "SUCCESS",
					tokens: response.usageMetadata?.totalTokenCount });
				return raw;
			} catch (error) {
				const status = typeof error === "object" && error !== null && "status" in error ? error.status : null;
				const retryable = typeof status === "number" ? status >= 500 : error instanceof TypeError;
				if (attempt || !retryable || deadline - Date.now() < 8_000) {
					this.record({ model: config.model, durationMs: Date.now() - started,
						outcome: error instanceof InvalidProviderOutput ? "OUTPUT_INVALID" : "UNAVAILABLE",
						...(error instanceof InvalidProviderOutput ? {} : { reason: failureReason(error) }) });
					throw new AppError("AI_UNAVAILABLE");
				}
			}
		}
		throw new AppError("AI_UNAVAILABLE");
	}
}
