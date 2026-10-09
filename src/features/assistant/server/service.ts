import "server-only";
import { z } from "zod";
import { formatMoney } from "@/lib/format";
import { requestItemSchema } from "@/features/requests/schemas";
import type { AdultActor } from "@/server/auth/require-adult";
import type { DeviceActor } from "@/server/auth/device-policy";
import { assertDevicePermission } from "@/server/auth/require-device";
import { signShoppingProposal } from "@/server/auth/shopping-proposal";
import { enforceRateLimit } from "@/server/rate-limit/limiter";
import { AppError } from "@/server/errors";
import { getShoppingAiConfig } from "@/lib/env/server";
import { interpretationSchema } from "@/lib/ai/schemas";
import { getShoppingProvider } from "@/lib/ai/get-provider";
import type { InterpretInput } from "@/lib/ai/provider";
import { aiPreferenceSchema, textRequestSchema } from "../schemas";
import type { Proposal } from "../types";
import { AI_CONSENT_VERSION, readAiPreference, readAssistantCatalog, readAssistantProfile, readProviderContext, writeAiPreference } from "./repository";
import { matchKeywords } from "./keyword-matcher";
import { groundInterpretation } from "./grounding";
import { fitBudget } from "./budget";
import { assistantCopy } from "../copy";

export async function assistantAvailability(actor: DeviceActor) {
	assertDevicePermission(actor, "create-own-request");
	const profile = await readAssistantProfile(actor);
	if (!profile) throw new AppError("UNAUTHENTICATED");
	return { voice: actor.profileKind === "ASSISTED_ADULT" && profile.aiAssistEnabled
		&& profile.aiConsentVersion === AI_CONSENT_VERSION && !!profile.aiConsentConfirmedAt
		&& profile.aiConsentConfirmedAt <= new Date() && !!getShoppingAiConfig(), child: actor.profileKind === "CHILD" };
}
export async function requireVoicePermission(actor: DeviceActor) {
	if (actor.profileKind === "CHILD") throw new AppError("FORBIDDEN");
	if (!getShoppingAiConfig()) throw new AppError("AI_UNAVAILABLE");
	if (!(await assistantAvailability(actor)).voice) throw new AppError("FORBIDDEN");
}
export async function enforceAssistantLimits(actor: DeviceActor) {
	await enforceRateLimit(`ai:device:${actor.deviceId}`, 30, 60 * 60_000);
	await enforceRateLimit(`ai:family:${actor.familyId}`, 200, 24 * 60 * 60_000);
}
export async function interpretShopping(actor: DeviceActor, request: InterpretInput["request"], voiceRateLimited = false): Promise<Proposal> {
	const deadline = Date.now() + 25_000;
	const availability = await assistantAvailability(actor);
	if (request.kind === "audio") await requireVoicePermission(actor);
	if (request.kind === "text") textRequestSchema.parse({ text: request.text });
	const catalogFilter = request.kind === "text" ? { text: request.text } : {};
	const catalog = await readAssistantCatalog(availability.child, catalogFilter);
	let local = true;
	let raw = request.kind === "text" ? matchKeywords(request.text, catalog) : null;
	if (availability.voice && catalog.length) {
		try {
			if (!voiceRateLimited || request.kind !== "audio") await enforceAssistantLimits(actor);
			const context = await readProviderContext([...new Set(catalog.map((product) => product.category))]);
			await requireVoicePermission(actor); // Fresh consent check immediately before transmitting data.
			const response = await getShoppingProvider().interpret({ request, locale: "en-US", audience: "assisted_adult", deadline,
				catalog: context.filter((product) => catalog.some((active) => active.sku === product.sku)) });
			raw = interpretationSchema.parse(response);
			local = false;
			// Products may have been archived while the provider was working. Ground against a fresh catalog.
		} catch (error) {
			if (request.kind === "audio") throw error instanceof AppError ? error : new AppError("AI_UNAVAILABLE");
			// Genuine local matching, not fabricated provider success. Keep the input for correction.
		}
	}
	if (!raw || (request.kind === "audio" && !raw.transcript?.trim())) throw new AppError("AI_UNAVAILABLE");
	const currentCatalog = local ? catalog : await readAssistantCatalog(availability.child, catalogFilter);
	const grounded = groundInterpretation(raw, currentCatalog);
	const amount = raw.statedBudget?.amount;
	const cents = amount === undefined ? null : Math.round(amount * 100);
	const budgetMinor = !availability.child && cents !== null && cents >= 100 && cents <= 50_000 ? cents : null;
	const items = budgetMinor === null ? grounded.items : fitBudget(grounded.items, currentCatalog, budgetMinor,
		new Set(raw.items.filter((item) => item.priority === "optional").map((item) => item.sku ?? ""))).items;
	const proposal: Proposal = { ...grounded, items, inputMode: request.kind === "audio" ? "VOICE" : "TEXT",
		inputText: request.kind === "text" ? request.text : raw.transcript!, budgetMinor, local };
	const proof = signShoppingProposal(actor, { inputMode: proposal.inputMode, inputText: proposal.inputText,
		items: [...items, ...grounded.questions.flatMap((question) => question.options)].map(({ sku, origin, isSubstitute, substitutionNote }) =>
			({ sku, origin, isSubstitute, substitutionNote })) });
	proposal.sourceProof = proof;
	proposal.items = items.map((item) => ({ ...item, proof }));
	proposal.questions = grounded.questions.map((q) => ({ ...q, options: q.options.map((item) => ({ ...item, proof })) }));
	return proposal;
}
function manager(actor: AdultActor) {
	if (!actor || actor.type !== "adult" || !["OWNER", "MANAGER"].includes(actor.role)) throw new AppError("FORBIDDEN");
}
export async function getAiPreference(actor: AdultActor, profileId: string) {
	manager(actor);
	const { profileId: id } = aiPreferenceSchema.parse({ profileId, enabled: false, consent: false });
	const profile = await readAiPreference(actor, id);
	if (!profile) throw new AppError("NOT_FOUND");
	return { enabled: profile.aiAssistEnabled, available: !!getShoppingAiConfig() && profile.kind === "ASSISTED_ADULT" };
}
export async function updateAiPreference(actor: AdultActor, input: unknown) {
	manager(actor);
	const data = aiPreferenceSchema.parse(input);
	const profile = await readAiPreference(actor, data.profileId);
	if (!profile) throw new AppError("NOT_FOUND");
	if (data.enabled && (profile.kind !== "ASSISTED_ADULT" || !getShoppingAiConfig())) throw new AppError("FORBIDDEN");
	await writeAiPreference(actor, data.profileId, data.enabled);
	return { profileId: data.profileId };
}

export async function estimateShoppingBudget(actor: DeviceActor, input: unknown) {
	assertDevicePermission(actor, "create-own-request");
	if (actor.profileKind === "CHILD") throw new AppError("FORBIDDEN");
	const data = z.strictObject({ budgetMinor: z.int().min(100).max(50_000),
		items: z.array(requestItemSchema.pick({ sku: true, quantity: true })).min(1).max(30) }).parse(input);
	const catalog = await readAssistantCatalog(false, { skus: data.items.map((item) => item.sku) });
	let total = 0;
	for (const item of data.items) {
		const product = catalog.find((p) => p.sku === item.sku);
		if (!product) throw new AppError("VALIDATION_FAILED");
		total += item.quantity * product.priceMinor;
	}
	return { line: assistantCopy.budgetLine({ total: formatMoney(total, "USD"),
		budget: formatMoney(data.budgetMinor, "USD"), over: total > data.budgetMinor }) };
}
