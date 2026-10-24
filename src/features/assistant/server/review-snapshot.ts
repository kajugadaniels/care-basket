import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type { ProposalItem } from "../types";
import type { GroundedProposal } from "./grounding";

export const reviewItemSchema = z.strictObject({
	sku: z.string().min(1).max(60),
	quantity: z.int().min(1).max(20),
	origin: z.enum(["REQUESTED", "SUGGESTED"]),
	uncertain: z.boolean(),
	isSubstitute: z.boolean(),
	substitutionNote: z.string().max(120).nullable(),
	suggestionReason: z.string().max(120).nullable().optional(),
}).refine((item) => item.origin !== "SUGGESTED" || item.quantity <= 6)
	.refine((item) => item.origin === "SUGGESTED" || !item.suggestionReason);

export const reviewSnapshotSchema = z.strictObject({
	items: z.array(reviewItemSchema).max(200),
	// Read legacy reviews until they expire; new reviews flatten all choices into items.
	questions: z.array(z.strictObject({
		question: z.string().min(1).max(100),
		options: z.array(reviewItemSchema).min(1).max(4),
	})).max(3),
	unrecognized: z.array(z.string().max(500)).max(10),
	inputMode: z.enum(["TEXT", "VOICE"]),
	inputText: z.string().max(1000),
	budgetMinor: z.int().min(100).max(50_000).nullable(),
	local: z.boolean(),
	sourceProof: z.string().min(1).max(16_000),
});

export type ReviewSnapshot = z.infer<typeof reviewSnapshotSchema>;

export function snapshotItem({ sku, quantity, origin, uncertain, isSubstitute, substitutionNote, suggestionReason }: ProposalItem) {
	return { sku, quantity, origin, uncertain, isSubstitute, substitutionNote, suggestionReason: suggestionReason ?? null };
}

export function reviewDigest(items: ReviewSnapshot["items"]) {
	return createHash("sha256").update(JSON.stringify(items)).digest("hex");
}

export function reviewCandidates(proposal: GroundedProposal): ProposalItem[] {
	const groups = [proposal.items, ...proposal.questions.map((question) => question.candidates ?? question.options)];
	const items = new Map<string, ProposalItem>();
	// Round-robin keeps milk visible alongside bread, even when bread has many matches.
	for (let index = 0; index < Math.max(0, ...groups.map((group) => group.length)); index++) {
		for (const group of groups) {
			const item = group[index];
			if (!item) continue;
			const previous = items.get(item.sku);
			if (!previous || previous.origin === "SUGGESTED" && item.origin === "REQUESTED") items.set(item.sku, item);
		}
	}
	return [...items.values()].slice(0, 200);
}
