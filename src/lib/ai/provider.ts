import type { AudioMime } from "@/lib/audio";

export type CatalogEntryForAi = {
	sku: string; name: string; category: string; sizeLabel: string; variantGroup: string; synonyms: string[];
};
export type InterpretInput = {
	request: { kind: "text"; text: string } | { kind: "audio"; audio: Uint8Array; mimeType: AudioMime };
	catalog: CatalogEntryForAi[]; locale: "en-US"; audience: "assisted_adult";
	deadline?: number;
};
export interface ShoppingAssistantProvider {
	interpret(input: InterpretInput): Promise<unknown>;
}
