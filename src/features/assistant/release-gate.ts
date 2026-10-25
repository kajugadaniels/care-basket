import { z } from "zod";

const releaseCheckStatusSchema = z.enum(["PASS", "FAIL", "NOT_RUN"]);

export const SHOPPING_GUIDE_RELEASE_CHECKS = [
	"reviewedCorpus",
	"automatedVerification",
	"desktopJourney",
	"mobileJourney",
	"deviceIsolation",
	"geminiText",
	"geminiVoice",
	"deterministicFallback",
	"explicitConfirmation",
	"managerBoundary",
	"paypalBoundary",
	"privacyReview",
] as const;

export const shoppingGuideReleaseEvidenceSchema = z.strictObject({
	reviewedCorpus: releaseCheckStatusSchema,
	automatedVerification: releaseCheckStatusSchema,
	desktopJourney: releaseCheckStatusSchema,
	mobileJourney: releaseCheckStatusSchema,
	deviceIsolation: releaseCheckStatusSchema,
	geminiText: releaseCheckStatusSchema,
	geminiVoice: releaseCheckStatusSchema,
	deterministicFallback: releaseCheckStatusSchema,
	explicitConfirmation: releaseCheckStatusSchema,
	managerBoundary: releaseCheckStatusSchema,
	paypalBoundary: releaseCheckStatusSchema,
	privacyReview: releaseCheckStatusSchema,
});

export type ShoppingGuideReleaseEvidence = z.infer<typeof shoppingGuideReleaseEvidenceSchema>;
export type ShoppingGuideReleaseBlocker = typeof SHOPPING_GUIDE_RELEASE_CHECKS[number] | "INVALID_EVIDENCE";

export type ShoppingGuideReleaseVerdict = {
	verdict: "RELEASE" | "HOLD";
	blockers: ShoppingGuideReleaseBlocker[];
};

export function evaluateShoppingGuideRelease(input: unknown): ShoppingGuideReleaseVerdict {
	const evidence = shoppingGuideReleaseEvidenceSchema.safeParse(input);
	if (!evidence.success) return { verdict: "HOLD", blockers: ["INVALID_EVIDENCE"] };

	const blockers = SHOPPING_GUIDE_RELEASE_CHECKS.filter(
		(check) => evidence.data[check] !== "PASS",
	);
	return blockers.length > 0
		? { verdict: "HOLD", blockers }
		: { verdict: "RELEASE", blockers: [] };
}
