// Screening is conservative, not a replacement for the mandatory human product review.
const EXCLUDED = /\b(alcohol(?:ic)?|beer|wine|wines|spirits|liquor|vodka|whisk(?:e)?y|rum|tequila|cider|tobacco|nicotine|cigarettes?|vapes?|cannabis|cbd|thc|marijuana|medicines?|medications?|supplements?|vitamins?|medical[- ]devices?|weapons?|guns?|knives|knife|bleach|drain[- ]cleaner|detergent[- ]pods?|laundry[- ]pods?|age[- ]restricted)\b/i;

export function isExcludedProduct(text: string): boolean {
	return EXCLUDED.test(text.normalize("NFKC").replace(/[\p{Cc}\p{Cf}]/gu, "").replace(/[-_:]+/g, " "));
}

export function isMisleadingCatalogText(text: string): boolean {
	return /https?:|ignore\s+.*instructions|system\s*prompt|buy\s+now|free\s+shipping/i.test(text);
}

export function cleanCatalogText(text: string): string {
	return text.normalize("NFKC").replace(/<[^>]*>/g, " ").replace(/[\p{Cc}\p{Cf}]/gu, " ").replace(/\s+/g, " ").trim();
}
