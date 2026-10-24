import "server-only";
import type { CatalogProductDto } from "@/features/catalog/types";
import { getRequesterProduct, getRequesterProducts, listRequesterProducts } from "@/features/catalog/server/service";
import type { DeviceActor } from "@/server/auth/device-policy";
import { AppError } from "@/server/errors";
import { requireShoppingAgentAuthority } from "../agent-policy";
import {
	shoppingGuideCatalogSearchSchema,
	shoppingGuideComparisonSchema,
	shoppingGuideProductSchema,
} from "../schemas";
import type { ShoppingGuideCatalogSearchResult, ShoppingGuideProductComparison } from "../types";

function projectProduct(product: CatalogProductDto): CatalogProductDto {
	// Keep a second explicit boundary even though the catalog service already returns this DTO.
	return {
		sku: product.sku,
		displayName: product.displayName,
		category: product.category,
		sizeLabel: product.sizeLabel,
		imagePath: product.imagePath,
	};
}

function differs(products: CatalogProductDto[], field: "displayName" | "category" | "sizeLabel") {
	return new Set(products.map((product) => product[field])).size > 1;
}

export async function searchCatalogForShoppingGuide(
	actor: DeviceActor,
	input: unknown,
): Promise<ShoppingGuideCatalogSearchResult> {
	requireShoppingAgentAuthority("SEARCH_APPROVED_CATALOG");
	const filters = shoppingGuideCatalogSearchSchema.parse(input);
	const page = await listRequesterProducts(actor, {
		q: filters.query,
		category: filters.category,
		limit: filters.limit,
	});

	return {
		products: page.products.map(projectProduct),
		hasMore: page.nextCursor !== null,
	};
}

export async function getProductForShoppingGuide(actor: DeviceActor, input: unknown): Promise<CatalogProductDto> {
	requireShoppingAgentAuthority("SEARCH_APPROVED_CATALOG");
	const { sku } = shoppingGuideProductSchema.parse(input);

	return projectProduct(await getRequesterProduct(actor, sku));
}

export async function compareProductsForShoppingGuide(
	actor: DeviceActor,
	input: unknown,
): Promise<ShoppingGuideProductComparison> {
	requireShoppingAgentAuthority("COMPARE_APPROVED_PRODUCTS");
	const { skus } = shoppingGuideComparisonSchema.parse(input);
	const products = (await getRequesterProducts(actor, skus)).map(projectProduct);
	if (products.length !== skus.length) throw new AppError("NOT_FOUND");

	return {
		products,
		differences: {
			displayName: differs(products, "displayName"),
			category: differs(products, "category"),
			sizeLabel: differs(products, "sizeLabel"),
		},
	};
}
