import { formatMoney } from "@/lib/format";
import { MAX_ITEM_QUANTITY } from "./limits";
import type { ManagerDetailDto } from "./types";

export type QuantityPreview = { itemId: string; quantity: number };

// Display only: snapshot cents never become an action payload or checkout amount.
export function previewBasketQuantity(request: ManagerDetailDto, edit: QuantityPreview): ManagerDetailDto {
	if (!request.editable || !Number.isInteger(edit.quantity) || edit.quantity < 1 || edit.quantity > MAX_ITEM_QUANTITY
		|| !request.items.some((item) => item.id === edit.itemId)) return request;
	const items = request.items.map((item) => item.id === edit.itemId ? {
		...item, quantity: edit.quantity, lineTotal: formatMoney(item.unitPriceMinor * edit.quantity, request.currency),
	} : item);
	const subtotalMinor = items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0);
	return { ...request, items, subtotalMinor, subtotal: formatMoney(subtotalMinor, request.currency) };
}
