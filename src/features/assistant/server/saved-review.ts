import "server-only";

import { randomUUID } from "node:crypto";
import type { InterpretInput } from "@/lib/ai/provider";
import type { DeviceActor } from "@/server/auth/device-policy";
import { assertDevicePermission } from "@/server/auth/require-device";
import { encryptReview, decryptReview } from "@/server/auth/review-encryption";
import { signShoppingProposal, verifyShoppingProposal } from "@/server/auth/shopping-proposal";
import { enforceRateLimit } from "@/server/rate-limit/limiter";
import { AppError } from "@/server/errors";
import { reviewPageSchema } from "../schemas";
import type { Proposal, ProposalItem } from "../types";
import { interpretShopping } from "./service";
import { readAssistantCatalog, readAssistantReview, writeAssistantReview } from "./repository";
import { reviewCandidates, reviewDigest, reviewSnapshotSchema, snapshotItem, type ReviewSnapshot } from "./review-snapshot";

const PAGE_SIZE = 12;

function buildPage(actor: DeviceActor, snapshot: ReviewSnapshot, reviewId: string, offset: number,
	products: Pick<ProposalItem, "sku" | "displayName" | "category" | "sizeLabel" | "imagePath">[]): Proposal {
	const candidates = [...snapshot.items, ...snapshot.questions.flatMap((question) => question.options)];
	const batch = candidates.slice(offset, offset + PAGE_SIZE);
	const bySku = new Map(products.map((product) => [product.sku, product]));
	const eligible = batch.filter((item) => bySku.has(item.sku));
	const claim = verifyShoppingProposal(actor, snapshot.sourceProof);
	const proof = claim.reviewDigest ? signShoppingProposal(actor, {
		inputMode: snapshot.inputMode, inputText: snapshot.inputText,
		items: eligible.map(({ sku, origin, isSubstitute, substitutionNote }) => ({ sku, origin, isSubstitute, substitutionNote })),
	}, claim.expiresAt) : snapshot.sourceProof;
	return {
		reviewId, nextOffset: offset + PAGE_SIZE < candidates.length ? offset + PAGE_SIZE : null,
		inputMode: snapshot.inputMode, inputText: snapshot.inputText, budgetMinor: snapshot.budgetMinor,
		local: snapshot.local, sourceProof: snapshot.sourceProof, unrecognized: snapshot.unrecognized,
		questions: [], items: eligible.map((item) => {
			const product = bySku.get(item.sku)!;
			return { ...item, displayName: product.displayName, sizeLabel: product.sizeLabel,
				category: product.category, imagePath: product.imagePath, proof };
		}),
	};
}

export async function interpretShoppingForReview(actor: DeviceActor, request: InterpretInput["request"],
	voiceRateLimited = false): Promise<Proposal & { reviewId: string }> {
	assertDevicePermission(actor, "create-own-request");
	await enforceRateLimit(`assistant-review:device:${actor.deviceId}`, 30, 60 * 60_000);
	const proposal = await interpretShopping(actor, request, voiceRateLimited);
	const claim = verifyShoppingProposal(actor, proposal.sourceProof!);
	const candidates = reviewCandidates(proposal);
	const items = candidates.map(snapshotItem);
	// The source proof binds every candidate; page proofs remain below the 42-item cap.
	const sourceProof = signShoppingProposal(actor, { inputMode: proposal.inputMode, inputText: proposal.inputText,
		items: [], reviewDigest: reviewDigest(items) }, claim.expiresAt);
	const snapshot = reviewSnapshotSchema.parse({ items, questions: [], unrecognized: proposal.unrecognized,
		inputMode: proposal.inputMode, inputText: proposal.inputText, budgetMinor: proposal.budgetMinor,
		local: proposal.local, sourceProof });
	const saved = await writeAssistantReview(actor, randomUUID(), encryptReview(actor, snapshot), new Date(claim.expiresAt));
	return { ...buildPage(actor, snapshot, saved.reviewId, 0, candidates), reviewId: saved.reviewId };
}

export async function restoreShoppingReview(actor: DeviceActor, input: unknown, offset = 0): Promise<Proposal | null> {
	assertDevicePermission(actor, "create-own-request");
	const parsed = reviewPageSchema.safeParse({ reviewId: input, offset });
	if (!parsed.success) return null;
	const row = await readAssistantReview(actor, parsed.data.reviewId);
	if (!row) return null;

	let snapshot: ReviewSnapshot;
	try {
		snapshot = reviewSnapshotSchema.parse(decryptReview(actor, row.payload));
		const claim = verifyShoppingProposal(actor, snapshot.sourceProof);
		if (claim.inputMode !== snapshot.inputMode || claim.inputText !== snapshot.inputText) return null;
		if (actor.profileKind === "CHILD"
			&& (!snapshot.local || snapshot.inputMode !== "TEXT" || snapshot.budgetMinor !== null)) return null;
		if (claim.reviewDigest) {
			if (snapshot.questions.length || reviewDigest(snapshot.items) !== claim.reviewDigest) return null;
		} else {
			const items = [...snapshot.items, ...snapshot.questions.flatMap((question) => question.options)];
			if (snapshot.items.length > 30 || !items.every((item) => claim.items.some((entry) =>
				entry.sku === item.sku && entry.origin === item.origin && entry.isSubstitute === item.isSubstitute
				&& entry.substitutionNote === item.substitutionNote))) return null;
		}
	} catch (error) {
		if (error instanceof AppError && error.code !== "VALIDATION_FAILED") throw error;
		return null; // Expired, malformed and inaccessible reviews share one recovery state.
	}

	const candidates = [...snapshot.items, ...snapshot.questions.flatMap((question) => question.options)];
	const skus = candidates.slice(offset, offset + PAGE_SIZE).map((item) => item.sku);
	const catalog = skus.length ? await readAssistantCatalog(actor.profileKind === "CHILD", { skus }) : [];
	try {
		const restored = buildPage(actor, snapshot, parsed.data.reviewId, offset, catalog);
		return offset > 0 || restored.items.length || restored.nextOffset !== null || restored.unrecognized.length ? restored : null;
	} catch (error) {
		// A review can expire while the metadata query is running.
		if (error instanceof AppError && error.code === "VALIDATION_FAILED") return null;
		throw error;
	}
}

export async function loadShoppingReviewPage(actor: DeviceActor, input: unknown) {
	assertDevicePermission(actor, "create-own-request");
	const data = reviewPageSchema.parse(input);
	await enforceRateLimit(`assistant-review-page:device:${actor.deviceId}`, 60, 60_000);
	const proposal = await restoreShoppingReview(actor, data.reviewId, data.offset);
	if (!proposal) throw new AppError("NOT_FOUND");
	return { items: proposal.items, nextCursor: proposal.nextOffset ?? null };
}
