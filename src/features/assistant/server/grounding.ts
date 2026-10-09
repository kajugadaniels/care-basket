import type { Interpretation } from "@/lib/ai/schemas";
import { assistantCopy } from "../copy";
import type { AssistantProduct, Proposal, ProposalItem } from "../types";
import { rankMatches } from "./keyword-matcher";
import { resolvePacks } from "./units";

export function displayItem(product: AssistantProduct, quantity: number, origin: ProposalItem["origin"], uncertain = false): ProposalItem {
	return { sku: product.sku, displayName: product.displayName, category: product.category, sizeLabel: product.sizeLabel,
		imagePath: product.imagePath, quantity, origin, uncertain, isSubstitute: false, substitutionNote: null };
}
export function groundInterpretation(raw: Interpretation, catalog: AssistantProduct[]): Pick<Proposal, "items" | "questions" | "unrecognized"> {
	const items: ProposalItem[] = [];
	const questions: Proposal["questions"] = [];
	const unrecognized = [...raw.unrecognized];
	let suggestions = 0;
	for (const entry of raw.items) {
		const product = catalog.find((p) => p.sku === entry.sku);
		if (!product) { unrecognized.push(entry.requestedText); continue; }
		if (entry.origin === "suggested" && ++suggestions > 12) continue;
		const variants = catalog.filter((p) => p.variantGroup === product.variantGroup);
		const resolved = resolvePacks(product, variants, entry.amount, entry.unit, entry.packCount);
		const origin = entry.origin === "requested" ? "REQUESTED" : "SUGGESTED";
		const quantity = origin === "SUGGESTED" ? Math.min(6, resolved.quantity) : resolved.quantity;
		const item = displayItem(resolved.product, quantity, origin, entry.confidence !== "high" || resolved.uncertain);
		if (entry.substitutionReason) {
			item.isSubstitute = true;
			// Provider prose must not smuggle prices, advice or links into a basket annotation.
			item.substitutionNote = assistantCopy.substitution;
			item.uncertain = true;
		}
		if (entry.confidence === "low" || resolved.uncertain) {
			const options = (entry.confidence === "low" ? rankMatches(entry.requestedText, catalog).map((m) => m.product) : variants)
				.slice(0, 4).map((p) => ({ ...displayItem(p, Math.min(origin === "SUGGESTED" ? 6 : 20,
					resolvePacks(p, [p], entry.amount, entry.unit, entry.packCount).quantity), origin, true),
					isSubstitute: item.isSubstitute, substitutionNote: item.substitutionNote }));
			if (questions.length < 3 && options.length >= 2) {
				questions.push({ question: assistantCopy.question, options }); continue;
			}
			if (entry.confidence === "low") { unrecognized.push(entry.requestedText); continue; }
		}
		const existing = items.find((p) => p.sku === item.sku);
		if (existing) {
			existing.origin = existing.origin === "REQUESTED" || origin === "REQUESTED" ? "REQUESTED" : "SUGGESTED";
			existing.quantity = Math.min(existing.origin === "SUGGESTED" ? 6 : 20, existing.quantity + quantity);
			existing.uncertain ||= item.uncertain;
		} else items.push(item);
	}
	if (raw.clarification && questions.length < 3) {
		const options = [...new Set(raw.clarification.optionSkus)].flatMap((sku) => {
			const product = catalog.find((p) => p.sku === sku);
			return product ? [displayItem(product, 1, "REQUESTED", true)] : [];
		});
		if (options.length >= 2) questions.push({ question: assistantCopy.question, options });
	}
	return { items, questions, unrecognized: [...new Set(unrecognized)].slice(0, 10) };
}
