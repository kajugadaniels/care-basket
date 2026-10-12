import "server-only";
import { subtotalMinor, requireUsd } from "@/lib/money";
import { orderItemsSchema } from "@/lib/paypal/schemas";
import { CheckoutFailure } from "./failure";

type PricingItem = {
	id: string; quantity: number; unitPriceMinor: number;
	product: { sku: string; displayName: string; sizeLabel: string; isActive: boolean; archivedAt: Date | null;
		demoPrices: { currency: string; priceMinor: number; approvedAt: Date }[] };
};

export function priceBasket(basket: { currency: string; subtotalMinor: number; items: PricingItem[] }, now: Date) {
	try {
		requireUsd(basket.currency);
		const lines = basket.items.map((item) => {
			const price = item.product.demoPrices[0];
			if (!item.product.isActive || item.product.archivedAt || item.product.demoPrices.length !== 1 || !price
				|| price.currency !== "USD" || price.approvedAt > now || !Number.isInteger(price.priceMinor) || price.priceMinor <= 0) {
				throw new CheckoutFailure("UNAVAILABLE_PRODUCT");
			}
			return { name: `${item.product.displayName} · ${item.product.sizeLabel}`,
				sku: item.product.sku, quantity: item.quantity, unitPriceMinor: price.priceMinor };
		});
		const items = orderItemsSchema.parse(lines);
		const amountMinor = subtotalMinor(items);
		return { items, amountMinor, changed: amountMinor !== basket.subtotalMinor
			|| items.some((item, index) => item.unitPriceMinor !== basket.items[index].unitPriceMinor) };
	} catch (error) {
		if (error instanceof CheckoutFailure) throw error;
		throw new CheckoutFailure("UNAVAILABLE_PRODUCT");
	}
}
