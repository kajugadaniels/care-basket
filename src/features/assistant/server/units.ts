import type { ShoppingUnit } from "@/lib/ai/schemas";
import type { AssistantProduct } from "../types";

export function baseAmount(amount: number, unit: ShoppingUnit, liquid: boolean) {
	const factor: Record<ShoppingUnit, number> = { count: 1, pack: 1, dozen: 12, g: 1, kg: 1000,
		oz: liquid ? 29.5735 : 28.3495, lb: 453.592, ml: 1, l: 1000, fl_oz: 29.5735, qt: 946.353, gal: 3785.41 };
	return amount * factor[unit];
}
export function resolvePacks(product: AssistantProduct, variants: AssistantProduct[], amount: number | null,
	unit: ShoppingUnit | null, packCount: number | null) {
	if (packCount !== null || unit === "pack") {
		const quantity = Math.ceil(packCount ?? amount ?? 1);
		return { product, quantity: Math.min(20, quantity), uncertain: quantity > 20 };
	}
	if (amount === null || unit === null) return { product, quantity: 1, uncertain: new Set(variants.map((p) => p.sizeLabel)).size > 1 };
	if (unit === "count" && product.netQuantityUnit !== "COUNT") return { product, quantity: Math.min(20, Math.ceil(amount)), uncertain: amount > 20 };
	const liquid = product.netQuantityUnit === "MILLILITER";
	const dimension = ["count", "dozen"].includes(unit) ? "COUNT"
		: ["ml", "l", "fl_oz", "qt", "gal"].includes(unit) || (unit === "oz" && liquid) ? "MILLILITER" : "GRAM";
	const wanted = baseAmount(amount, unit, liquid);
	const choices = variants.filter((p) => p.netQuantityUnit === dimension && p.netQuantity > 0).map((p) => {
		const quantity = Math.ceil(wanted / p.netQuantity);
		return { product: p, quantity, excess: p.netQuantity * quantity - wanted };
	}).filter((p) => p.quantity >= 1 && p.quantity <= 20).sort((a, b) => a.excess - b.excess || a.quantity - b.quantity);
	if (!choices[0]) return { product, quantity: 1, uncertain: true };
	return { product: choices[0].product, quantity: choices[0].quantity, uncertain: choices[0].excess / wanted > 0.25 };
}
