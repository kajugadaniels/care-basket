import "server-only";
import type { DeviceActor } from "@/server/auth/device-policy";
import { requireShoppingAgentAuthority } from "../agent-policy";
import { assistantCopy } from "../copy";
import { shoppingGuideOperationSchema } from "../schemas";
import type { ShoppingGuideOrchestrationResult } from "../types";
import {
	compareProductsForShoppingGuide,
	getProductForShoppingGuide,
	searchCatalogForShoppingGuide,
} from "./catalog-capabilities";

function readableCategory(category: string | undefined): string {
	return category?.toLowerCase().replaceAll("_", " ") ?? "groceries";
}

/**
 * Routes one already-validated shopping-guide operation to a bounded catalog
 * capability. The operation kind comes from application code, never from Gemini.
 */
export async function orchestrateShoppingGuide(
	actor: DeviceActor,
	input: unknown,
): Promise<ShoppingGuideOrchestrationResult> {
	const operation = shoppingGuideOperationSchema.parse(input);
	requireShoppingAgentAuthority("INTERPRET_REQUEST");

	if (operation.kind === "SEARCH") {
		const result = await searchCatalogForShoppingGuide(actor, {
			query: operation.query,
			category: operation.category,
			limit: operation.limit,
		});
		const requestedText = operation.query || readableCategory(operation.category);

		return {
			kind: "PROPOSAL",
			requestedText,
			products: result.products,
			unresolved: result.products.length === 0 ? [requestedText] : [],
			hasMore: result.hasMore,
		};
	}

	if (operation.kind === "PRODUCT") {
		const product = await getProductForShoppingGuide(actor, { sku: operation.sku });

		return {
			kind: "PROPOSAL",
			requestedText: product.displayName,
			products: [product],
			unresolved: [],
			hasMore: false,
		};
	}

	const comparison = await compareProductsForShoppingGuide(actor, { skus: operation.skus });

	return {
		kind: "CLARIFICATION",
		question: assistantCopy.question,
		options: comparison.products,
		differences: comparison.differences,
	};
}
