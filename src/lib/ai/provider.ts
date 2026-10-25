import type { AudioMime } from "@/lib/audio";

export type CatalogEntryForAi = {
	sku: string; name: string; category: string; sizeLabel: string; variantGroup: string; synonyms: string[];
};
export type InterpretInput = {
	request: { kind: "text"; text: string } | { kind: "audio"; audio: Uint8Array; mimeType: AudioMime };
	catalog: CatalogEntryForAi[]; locale: "en-US"; audience: "assisted_adult";
	deadline?: number;
};

export type AiProviderFailureReason =
	| "AUTHENTICATION"
	| "MODEL_UNAVAILABLE"
	| "NETWORK"
	| "PROVIDER_ERROR"
	| "RATE_LIMITED"
	| "REQUEST_REJECTED"
	| "TIMEOUT";

export type AiProviderMetric = {
	model: string;
	durationMs: number;
	outcome: "SUCCESS" | "UNAVAILABLE" | "OUTPUT_INVALID";
	reason?: AiProviderFailureReason;
	tokens?: number;
};

export type AiProviderMetricSink = (metric: AiProviderMetric) => void;

export interface ShoppingAssistantProvider {
	interpret(input: InterpretInput): Promise<unknown>;
}
