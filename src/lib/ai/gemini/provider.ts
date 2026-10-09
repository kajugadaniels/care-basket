import "server-only";
import { GoogleGenAI, type Part } from "@google/genai";
import { z } from "zod";
import { getShoppingAiConfig } from "@/lib/env/server";
import { AppError } from "@/server/errors";
import { shoppingResponseJsonSchema } from "../response-schema";
import { catalogContextSchema } from "../catalog-context";
import { logShoppingAiMetric } from "../metrics";
import { SHOPPING_INSTRUCTION } from "../prompts";
import type { InterpretInput, ShoppingAssistantProvider } from "../provider";

export class GeminiShoppingProvider implements ShoppingAssistantProvider {
	async interpret(input: InterpretInput): Promise<unknown> {
		const config = getShoppingAiConfig();
		if (!config || input.audience !== "assisted_adult") throw new AppError("AI_UNAVAILABLE");
		const started = Date.now();
		const context = z.array(catalogContextSchema).max(200).safeParse(input.catalog);
		if (!context.success) throw new AppError("AI_UNAVAILABLE");
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
				if (remaining <= 0) throw new AppError("AI_UNAVAILABLE");
				const response = await client.models.generateContent({ model: config.model, contents: [{ role: "user", parts }],
					config: { systemInstruction: SHOPPING_INSTRUCTION, temperature: 0.1, maxOutputTokens: 8192,
						responseMimeType: "application/json", responseJsonSchema: shoppingResponseJsonSchema(),
						abortSignal: AbortSignal.timeout(Math.min(20_000, remaining)),
						httpOptions: { timeout: Math.min(20_000, remaining), retryOptions: { attempts: 1 } } } });
				if (!response.text || response.text.length > 64_000) throw new AppError("AI_UNAVAILABLE");
				const raw: unknown = JSON.parse(response.text);
				logShoppingAiMetric(config.model, started, "ok", response.usageMetadata?.totalTokenCount);
				return raw;
			} catch (error) {
				const status = typeof error === "object" && error !== null && "status" in error ? error.status : null;
				const retryable = typeof status === "number" ? status >= 500 : error instanceof TypeError;
				if (attempt || !retryable || deadline - Date.now() < 8_000) {
					logShoppingAiMetric(config.model, started, "AI_UNAVAILABLE");
					throw new AppError("AI_UNAVAILABLE");
				}
			}
		}
		throw new AppError("AI_UNAVAILABLE");
	}
}
