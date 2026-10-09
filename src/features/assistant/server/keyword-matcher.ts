import type { Interpretation, ShoppingUnit } from "@/lib/ai/schemas";
import type { AssistantProduct } from "../types";

const numbers: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
	seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const units: Record<string, ShoppingUnit> = { "fluid ounces": "fl_oz", "fluid ounce": "fl_oz",
	"fl oz": "fl_oz", packs: "pack", pack: "pack", bags: "pack", bag: "pack", cartons: "pack", carton: "pack", boxes: "pack", box: "pack",
	kilo: "kg", kilos: "kg", kilograms: "kg", kg: "kg", grams: "g", g: "g", ounces: "oz", oz: "oz", pounds: "lb", lb: "lb",
	milliliters: "ml", ml: "ml", litres: "l", liters: "l", litre: "l", liter: "l", l: "l",
	ounce: "oz", pound: "lb", gram: "g", kilogram: "kg", milliliter: "ml", millilitre: "ml",
	quarts: "qt", quart: "qt", qt: "qt", gallons: "gal", gallon: "gal", gal: "gal", dozen: "dozen", bars: "count", bar: "count" };
export function normalize(value: string) {
	return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
export function rankMatches(phrase: string, catalog: AssistantProduct[]) {
	const words = normalize(phrase).split(" ").filter((word) => word.length > 2 && !["need", "want", "please", "some", "the", "and", "for"].includes(word));
	return catalog.map((product) => {
		const aliases = [product.displayName, product.variantGroup.replace(/-/g, " "), ...product.synonyms].map(normalize);
		const score = Math.max(0, ...aliases.map((alias) => words.reduce((sum, word) =>
			sum + (alias.split(" ").some((token) => token === word || token === word.replace(/s$/, "")) ? 1 : 0), 0)));
		return { product, score };
	}).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.product.sku.localeCompare(b.product.sku));
}
export function matchKeywords(text: string, catalog: AssistantProduct[]): Interpretation {
	const result: Interpretation = { transcript: null, intent: "list", items: [], occasion: null, statedBudget: null,
		clarification: null, unrecognized: [] };
	const budget = text.match(/\$([0-9]+(?:\.[0-9]{1,2})?)/);
	if (budget) result.statedBudget = { amount: Number(budget[1]), currency: "USD" };
	for (const phrase of text.replace(/\$[0-9]+(?:\.[0-9]{1,2})?/g, "").split(/\band\b|[,;\n]/i).slice(0, 30)) {
		const clean = normalize(phrase).replace(/^i (?:need|want|would like) /, "").trim();
		if (!clean) continue;
		const matches = rankMatches(clean, catalog);
		if (!matches[0]) { result.unrecognized.push(phrase.trim().slice(0, 80)); continue; }
		// Parse quantities from the original phrase; normalization removes decimal points.
		const numericPhrase = phrase.trim().toLowerCase().replace(/^i (?:need|want|would like) /, "").trim();
		const count = numericPhrase.match(/^(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/);
		let amount = count ? numbers[count[1]] ?? Number(count[1]) : null;
		const unitKey = Object.keys(units).find((key) => new RegExp(`\\b${key}\\b`).test(clean));
		let unit = unitKey ? units[unitKey] : amount === null ? null : "count";
		if (amount !== null && amount > 100 && (unit === "g" || unit === "ml")) {
			amount /= 1000; unit = unit === "g" ? "kg" : "l";
		}
		result.items.push({ sku: matches[0].product.sku, requestedText: clean.slice(0, 80), origin: "requested",
			amount: amount !== null && amount > 0 && amount <= 100 ? amount : null, unit,
			packCount: unit === "pack" && amount !== null ? Math.min(20, Math.ceil(amount)) : null,
			priority: "essential", confidence: matches[1]?.score === matches[0].score ? "low"
				: amount !== null && (amount > 20 && unit === "pack" || amount > 100 || amount <= 0) ? "medium" : "high", substitutionReason: null });
	}
	result.unrecognized = result.unrecognized.slice(0, 10);
	return result;
}
