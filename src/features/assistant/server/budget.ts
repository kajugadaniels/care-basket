import type { AssistantProduct, ProposalItem } from "../types";

export function fitBudget(items: ProposalItem[], catalog: AssistantProduct[], budgetMinor: number,
	optionalSkus: ReadonlySet<string>) {
	const prices = new Map(catalog.map((product) => [product.sku, product.priceMinor]));
	const total = (values: ProposalItem[]) => values.reduce((sum, item) => sum + (prices.get(item.sku) ?? 0) * item.quantity, 0);
	let fitted = items.map((item) => ({ ...item }));
	const suggestions = fitted.filter((item) => item.origin === "SUGGESTED")
		.sort((a, b) => (prices.get(b.sku) ?? 0) * b.quantity - (prices.get(a.sku) ?? 0) * a.quantity);
	for (const item of suggestions) {
		if (total(fitted) <= budgetMinor) break;
		if (optionalSkus.has(item.sku)) fitted = fitted.filter((p) => p.sku !== item.sku);
	}
	for (const item of fitted.filter((p) => p.origin === "SUGGESTED")) {
		while (item.quantity > 1 && total(fitted) > budgetMinor) item.quantity--;
	}
	return { items: fitted, totalMinor: total(fitted), overBudget: total(fitted) > budgetMinor };
}
