export const MAX_USD_MINOR = 2_147_483_647;

export function requireUsd(currency: string): asserts currency is "USD" {
	if (currency !== "USD") throw new Error("Only USD is supported.");
}

function minorUnits(value: number) {
	if (!Number.isSafeInteger(value) || value < 0 || value > MAX_USD_MINOR) {
		throw new Error("Invalid integer money amount.");
	}
	return value;
}

export function usdDecimal(value: number): string {
	minorUnits(value);
	return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

export function usdMinor(value: string, currency = "USD"): number {
	requireUsd(currency);
	if (!/^(0|[1-9]\d{0,7})\.\d{2}$/.test(value)) throw new Error("Invalid USD decimal amount.");
	const [whole, fraction] = value.split(".");
	return minorUnits(Number(whole) * 100 + Number(fraction));
}

export function lineTotalMinor(unitPriceMinor: number, quantity: number): number {
	minorUnits(unitPriceMinor);
	if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) throw new Error("Invalid item quantity.");
	return minorUnits(unitPriceMinor * quantity);
}

export function subtotalMinor(items: readonly { unitPriceMinor: number; quantity: number }[]): number {
	if (items.length < 1 || items.length > 30) throw new Error("Invalid basket size.");
	return items.reduce((total, item) => minorUnits(total + lineTotalMinor(item.unitPriceMinor, item.quantity)), 0);
}
