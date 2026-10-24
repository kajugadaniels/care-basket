import type { Interpretation } from "@/lib/ai/schemas";
import { assistantCopy } from "../copy";
import type { AssistantProduct, Proposal, ProposalItem } from "../types";
import { rankMatches } from "./keyword-matcher";
import { resolvePacks } from "./units";

const categoryNames: Record<AssistantProduct["category"], string> = {
	PRODUCE: "produce",
	DAIRY_EGGS: "dairy and eggs",
	BAKERY: "bakery",
	PANTRY: "pantry",
	BREAKFAST: "breakfast",
	MEAT_SEAFOOD: "meat and seafood",
	FROZEN: "frozen food",
	SNACKS: "snacks",
	BEVERAGES: "beverages",
	HOUSEHOLD: "household",
	PERSONAL_CARE: "personal care",
};

function explainSuggestion(item: ProposalItem, requestedCategories: ReadonlySet<AssistantProduct["category"]>) {
	if (item.origin !== "SUGGESTED") return null;
	const category = categoryNames[item.category];
	return requestedCategories.has(item.category)
		? `Another ${category} choice based on the groceries you asked for.`
		: `An extra ${category} idea based on this shopping request.`;
}

export function displayItem(product: AssistantProduct, quantity: number, origin: ProposalItem["origin"], uncertain = false): ProposalItem {
	return { sku: product.sku, displayName: product.displayName, category: product.category, sizeLabel: product.sizeLabel,
		imagePath: product.imagePath, quantity, origin, uncertain, isSubstitute: false, substitutionNote: null,
		suggestionReason: null };
}
export type GroundedProposal = Pick<Proposal, "items" | "unrecognized"> & {
	questions: { question: string; options: ProposalItem[]; candidates?: ProposalItem[] }[];
};

export function groundInterpretation(raw: Interpretation, catalog: AssistantProduct[]): GroundedProposal {
	const items: ProposalItem[] = [];
	const questions: GroundedProposal["questions"] = [];
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
			const candidates = (entry.confidence === "low" ? rankMatches(entry.requestedText, catalog).map((m) => m.product) : variants)
				.slice(0, 200).map((p) => ({ ...displayItem(p, Math.min(origin === "SUGGESTED" ? 6 : 20,
					resolvePacks(p, [p], entry.amount, entry.unit, entry.packCount).quantity), origin, true),
					isSubstitute: item.isSubstitute, substitutionNote: item.substitutionNote }));
			if (questions.length < 3 && candidates.length >= 2) {
				questions.push({ question: assistantCopy.question, options: candidates.slice(0, 4), candidates }); continue;
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
	const requestedCategories = new Set(raw.items.flatMap((entry) => {
		if (entry.origin !== "requested") return [];
		const product = catalog.find((candidate) => candidate.sku === entry.sku);
		return product ? [product.category] : [];
	}));
	const explain = (item: ProposalItem): ProposalItem => ({
		...item,
		suggestionReason: explainSuggestion(item, requestedCategories),
	});
	return {
		items: items.map(explain),
		questions: questions.map((question) => ({
			...question,
			options: question.options.map(explain),
			...(question.candidates ? { candidates: question.candidates.map(explain) } : {}),
		})),
		unrecognized: [...new Set(unrecognized)].slice(0, 10),
	};
}
