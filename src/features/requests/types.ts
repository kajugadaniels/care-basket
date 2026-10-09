import type { CatalogProductDto } from "@/features/catalog/types";
import type { ActionResult } from "@/types/action-result";
import type { REQUEST_STATUSES } from "./limits";

export type RequestStatus = typeof REQUEST_STATUSES[number];
export type DraftItem = CatalogProductDto & { quantity: number };
export type RequestItemDto = CatalogProductDto & { id: string; quantity: number };
export type RequestSummaryDto = {
	id: string; status: RequestStatus; submittedAt: string; itemCount: number;
};
export type RequestDetailDto = RequestSummaryDto & {
	revision: number; items: RequestItemDto[]; editable: boolean;
};
export type ManagerSummaryDto = RequestSummaryDto & { displayName: string; subtotal: string };
export type ManagerDetailDto = Omit<RequestDetailDto, "items"> & ManagerSummaryDto & {
	inputText: string | null;
	items: (RequestItemDto & {
		unitPrice: string; lineTotal: string; origin: "REQUESTED" | "SUGGESTED";
		isSubstitute: boolean; substitutionNote: string | null;
	})[];
};
export type RequestPage<T> = { requests: T[]; nextCursor: string | null };
export type RequestMutationResult = ActionResult<{ requestId: string }>;
