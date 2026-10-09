export type PackageQuantity = { netQuantity: number; netQuantityUnit: "GRAM" | "MILLILITER" | "COUNT"; sizeLabel: string };

const UNITS: Record<string, { factor: number; unit: PackageQuantity["netQuantityUnit"] }> = {
	g: { factor: 1, unit: "GRAM" }, kg: { factor: 1000, unit: "GRAM" },
	oz: { factor: 28.3495, unit: "GRAM" }, lb: { factor: 453.592, unit: "GRAM" }, lbs: { factor: 453.592, unit: "GRAM" },
	ml: { factor: 1, unit: "MILLILITER" }, l: { factor: 1000, unit: "MILLILITER" },
	"fl oz": { factor: 29.5735, unit: "MILLILITER" }, qt: { factor: 946.353, unit: "MILLILITER" },
	gal: { factor: 3785.41, unit: "MILLILITER" }, count: { factor: 1, unit: "COUNT" },
	ct: { factor: 1, unit: "COUNT" }, pcs: { factor: 1, unit: "COUNT" }, dozen: { factor: 12, unit: "COUNT" },
};

function formatAmount(amount: number): string {
	return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
}

export function normalizeQuantity(value: number | null | undefined, unit: string | null | undefined, text?: string | null): PackageQuantity | null {
	let amount = value;
	let sourceUnit = unit?.trim().toLowerCase();
	if (!amount || !sourceUnit || !UNITS[sourceUnit]) {
		const match = /^(\d+(?:\.\d+)?)\s*(fl\s*oz|kg|g|ml|l|oz|lbs?|qt|gal|ct|count|pcs|dozen)$/i.exec(text?.trim() ?? "");
		if (!match) return null;
		amount = Number(match[1]);
		sourceUnit = match[2].toLowerCase().replace(/\s+/g, " ");
	}
	const conversion = UNITS[sourceUnit];
	if (!conversion || !Number.isFinite(amount) || amount <= 0) return null;
	const netQuantity = Math.round(amount * conversion.factor);
	if (netQuantity < 1 || netQuantity > 1_000_000 || (conversion.unit === "COUNT" && !Number.isInteger(amount * conversion.factor))) return null;
	const sizeLabel = conversion.unit === "COUNT"
		? `${netQuantity} count`
		: conversion.unit === "GRAM"
			? `${formatAmount(netQuantity / 28.3495)} oz (${formatAmount(netQuantity)} g)`
			: `${formatAmount(netQuantity / 29.5735)} fl oz (${netQuantity >= 1000 ? `${formatAmount(netQuantity / 1000)} L` : `${netQuantity} mL`})`;
	return { netQuantity, netQuantityUnit: conversion.unit, sizeLabel };
}
