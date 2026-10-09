"use server";

import { revalidatePath } from "next/cache";
import { requireDevice } from "@/server/auth/require-device";
import { requireAdult } from "@/server/auth/require-adult";
import type { ActionResult } from "@/types/action-result";
import { assistantFailure } from "./server/failure";
import { textRequestSchema } from "./schemas";
import type { Proposal } from "./types";
import { estimateShoppingBudget, interpretShopping, updateAiPreference } from "./server/service";

export async function interpretTextAction(input: unknown): Promise<ActionResult<Proposal>> {
	try {
		const actor = await requireDevice();
		const parsed = textRequestSchema.parse(input);
		return { ok: true, data: await interpretShopping(actor, { kind: "text", text: parsed.text }) };
	} catch (error) { return assistantFailure(error); }
}
export async function updateAiPreferenceAction(input: unknown): Promise<ActionResult<{ profileId: string }>> {
	try {
		const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
		const result = await updateAiPreference(actor, input);
		revalidatePath(`/family/members/${result.profileId}`);
		return { ok: true, data: result };
	} catch (error) { return assistantFailure(error); }
}

export async function estimateShoppingBudgetAction(input: unknown): Promise<ActionResult<{ line: string }>> {
	try { return { ok: true, data: await estimateShoppingBudget(await requireDevice(), input) }; }
	catch (error) { return assistantFailure(error); }
}
