import "server-only";
import { GeminiShoppingProvider } from "./gemini/provider";
import type { AiProviderMetricSink, ShoppingAssistantProvider } from "./provider";

export function getShoppingProvider(onMetric: AiProviderMetricSink): ShoppingAssistantProvider {
	return new GeminiShoppingProvider(onMetric);
}
