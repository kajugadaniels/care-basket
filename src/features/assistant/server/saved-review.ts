import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { InterpretInput } from "@/lib/ai/provider";
import type { DeviceActor } from "@/server/auth/device-policy";
import { assertDevicePermission } from "@/server/auth/require-device";
import { encryptReview, decryptReview } from "@/server/auth/review-encryption";
import { verifyShoppingProposal } from "@/server/auth/shopping-proposal";
import { enforceRateLimit } from "@/server/rate-limit/limiter";
import { AppError } from "@/server/errors";
import type { Proposal, ProposalItem } from "../types";
import { interpretShopping } from "./service";
import { readAssistantCatalog, readAssistantReview, writeAssistantReview } from "./repository";

const itemSchema = z.strictObject({
	sku: z.string().min(1).max(60),
	quantity: z.int().min(1).max(20),
	origin: z.enum(["REQUESTED", "SUGGESTED"]),
	uncertain: z.boolean(),
	isSubstitute: z.boolean(),
	substitutionNote: z.string().max(120).nullable(),
}).refine((item) => item.origin !== "SUGGESTED" || item.quantity <= 6);

const snapshotSchema = z.strictObject({
	items: z.array(itemSchema).max(30),
	questions: z.array(z.strictObject({
		question: z.string().min(1).max(100),
		options: z.array(itemSchema).min(1).max(4),
	})).max(3),
	unrecognized: z.array(z.string().max(500)).max(10),
	inputMode: z.enum(["TEXT", "VOICE"]),
	inputText: z.string().max(1000),
	budgetMinor: z.int().min(100).max(50_000).nullable(),
	local: z.boolean(),
	sourceProof: z.string().min(1).max(16_000),
});

function snapshotItem({ sku, quantity, origin, uncertain, isSubstitute, substitutionNote }: ProposalItem) {
	return { sku, quantity, origin, uncertain, isSubstitute, substitutionNote };
}

export async function interpretShoppingForReview(
	actor: DeviceActor,
	request: InterpretInput["request"],
	voiceRateLimited = false,
): Promise<Proposal & { reviewId: string }> {
	assertDevicePermission(actor, "create-own-request");
	await enforceRateLimit(`assistant-review:device:${actor.deviceId}`, 30, 60 * 60_000);
	const proposal = await interpretShopping(actor, request, voiceRateLimited);
	// Explicit projection prevents catalog metadata or future proposal fields being persisted.
	const snapshot = snapshotSchema.parse({
		items: proposal.items.map(snapshotItem),
		questions: proposal.questions.map((question) => ({
			question: question.question,
			options: question.options.map(snapshotItem),
		})),
		unrecognized: proposal.unrecognized,
		inputMode: proposal.inputMode,
		inputText: proposal.inputText,
		budgetMinor: proposal.budgetMinor,
		local: proposal.local,
		sourceProof: proposal.sourceProof,
	});
	const claim = verifyShoppingProposal(actor, snapshot.sourceProof);
	const expiresAt = new Date(Math.min(claim.expiresAt, Date.now() + 30 * 60_000));
	const saved = await writeAssistantReview(actor, randomUUID(), encryptReview(actor, snapshot), expiresAt);
	return { ...proposal, reviewId: saved.reviewId };
}

export async function restoreShoppingReview(actor: DeviceActor, input: unknown): Promise<Proposal | null> {
	assertDevicePermission(actor, "create-own-request");
	const id = z.uuid().safeParse(input);
	if (!id.success) return null;
	const row = await readAssistantReview(actor, id.data);
	if (!row) return null;

	let snapshot: z.infer<typeof snapshotSchema>;
	try {
		snapshot = snapshotSchema.parse(decryptReview(actor, row.payload));
		const claim = verifyShoppingProposal(actor, snapshot.sourceProof);
		if (claim.inputMode !== snapshot.inputMode || claim.inputText !== snapshot.inputText) return null;
		if (actor.profileKind === "CHILD"
			&& (!snapshot.local || snapshot.inputMode !== "TEXT" || snapshot.budgetMinor !== null)) return null;

		const items = [...snapshot.items, ...snapshot.questions.flatMap((question) => question.options)];
		const matchingProvenance = items.every((item) => claim.items.some((entry) =>
			entry.sku === item.sku
			&& entry.origin === item.origin
			&& entry.isSubstitute === item.isSubstitute
			&& entry.substitutionNote === item.substitutionNote,
		));
		if (!matchingProvenance) return null;
	} catch (error) {
		if (error instanceof AppError && error.code !== "VALIDATION_FAILED") throw error;
		// Invalid/expired content is indistinguishable from an inaccessible lookup ID.
		return null;
	}

	const allItems = [...snapshot.items, ...snapshot.questions.flatMap((question) => question.options)];
	const skus = [...new Set(allItems.map((item) => item.sku))];
	const catalog = skus.length ? await readAssistantCatalog(actor.profileKind === "CHILD", { skus }) : [];
	const products = new Map(catalog.map((product) => [product.sku, product]));
	function restoreItems(items: z.infer<typeof itemSchema>[]): ProposalItem[] {
		return items.flatMap((item) => {
			const product = products.get(item.sku);
			if (!product) return [];
			return [{
				...item,
				displayName: product.displayName,
				sizeLabel: product.sizeLabel,
				category: product.category,
				imagePath: product.imagePath,
				proof: snapshot.sourceProof,
			}];
		});
	}

	const restored: Proposal = {
		...snapshot,
		reviewId: id.data,
		items: restoreItems(snapshot.items),
		questions: snapshot.questions.map((question) => ({ ...question, options: restoreItems(question.options) }))
			.filter((question) => question.options.length > 0),
	};
	return restored.items.length || restored.questions.length || restored.unrecognized.length ? restored : null;
}
