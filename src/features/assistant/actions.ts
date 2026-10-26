"use server";

import { revalidatePath } from "next/cache";
import { requireDevice } from "@/server/auth/require-device";
import { requireAdult } from "@/server/auth/require-adult";
import type { ActionResult, MutationResult } from "@/types/action-result";
import { assistantCopy } from "./copy";
import { assistantFailure } from "./server/failure";
import { textRequestSchema, reviewPageSchema, shoppingGuideOperationSchema } from "./schemas";
import type { Proposal, ProposalItem, ShoppingGuideOrchestrationResult } from "./types";
import { estimateShoppingBudget, guideShopping, updateAiPreference } from "./server/service";
import { interpretShoppingForReview, loadShoppingReviewPage } from "./server/saved-review";
import { proposalFeedback } from "./server/feedback";

export async function guideShoppingAction(input: unknown): Promise<ActionResult<ShoppingGuideOrchestrationResult>> {
	try {
		const actor = await requireDevice();
		const operation = shoppingGuideOperationSchema.parse(input);
		return { ok: true, data: await guideShopping(actor, operation) };
	} catch (error) { return assistantFailure(error); }
}

export async function loadReviewProductsAction(input: unknown): Promise<ActionResult<{ items: ProposalItem[]; nextCursor: number | null }>> {
	try {
		const actor = await requireDevice();
		return { ok: true, data: await loadShoppingReviewPage(actor, reviewPageSchema.parse(input)) };
	} catch (error) { return assistantFailure(error); }
}

export async function interpretTextAction(input: unknown): Promise<MutationResult<Proposal>> {
	try {
		const actor = await requireDevice();
		const parsed = textRequestSchema.parse(input);
		const proposal = await interpretShoppingForReview(actor, { kind: "text", text: parsed.text });
		return { ok: true, data: proposal, feedback: proposalFeedback(proposal) };
	} catch (error) { return assistantFailure(error); }
}
export async function updateAiPreferenceAction(input: unknown): Promise<MutationResult<{ profileId: string; enabled: boolean }>> {
	try {
		const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
		const result = await updateAiPreference(actor, input);
		revalidatePath(`/family/members/${result.profileId}/edit`);
		return {
			ok: true,
			data: result,
			feedback: { kind: "success", message: result.enabled ? assistantCopy.enabled : assistantCopy.revoked },
		};
	} catch (error) { return assistantFailure(error); }
}

export async function estimateShoppingBudgetAction(input: unknown): Promise<ActionResult<{ line: string }>> {
	try { return { ok: true, data: await estimateShoppingBudget(await requireDevice(), input) }; }
	catch (error) { return assistantFailure(error); }
}
