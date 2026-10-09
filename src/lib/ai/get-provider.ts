import "server-only";
import { GeminiShoppingProvider } from "./gemini/provider";
import type { ShoppingAssistantProvider } from "./provider";

export function getShoppingProvider(): ShoppingAssistantProvider {
	return new GeminiShoppingProvider();
}
