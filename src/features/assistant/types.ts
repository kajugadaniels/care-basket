import type { CatalogProductDto } from "@/features/catalog/types";
export type AssistantProduct = CatalogProductDto & {
	variantGroup: string; synonyms: string[]; netQuantity: number;
	netQuantityUnit: "GRAM" | "MILLILITER" | "COUNT"; priceMinor: number;
};
export type ProposalItem = CatalogProductDto & {
	quantity: number; origin: "REQUESTED" | "SUGGESTED"; uncertain: boolean;
	isSubstitute: boolean; substitutionNote: string | null; proof?: string;
};
export type Proposal = {
	reviewId?: string;
	nextOffset?: number | null;
	items: ProposalItem[]; questions: { question: string; options: ProposalItem[] }[];
	unrecognized: string[]; inputMode: "TEXT" | "VOICE"; inputText: string;
	budgetMinor: number | null; local: boolean; sourceProof?: string;
};

export type ShoppingGuideCatalogSearchResult = {
	products: CatalogProductDto[];
	hasMore: boolean;
};

export type ShoppingGuideProductComparison = {
	products: CatalogProductDto[];
	differences: {
		displayName: boolean;
		category: boolean;
		sizeLabel: boolean;
	};
};
