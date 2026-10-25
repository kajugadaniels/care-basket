import { describe, expect, it } from "vitest";
import {
	evaluateShoppingGuideRelease,
	SHOPPING_GUIDE_RELEASE_CHECKS,
	type ShoppingGuideReleaseEvidence,
} from "./release-gate";

const completeEvidence = {
	reviewedCorpus: "PASS",
	automatedVerification: "PASS",
	desktopJourney: "PASS",
	mobileJourney: "PASS",
	deviceIsolation: "PASS",
	geminiText: "PASS",
	geminiVoice: "PASS",
	deterministicFallback: "PASS",
	explicitConfirmation: "PASS",
	managerBoundary: "PASS",
	paypalBoundary: "PASS",
	privacyReview: "PASS",
} satisfies ShoppingGuideReleaseEvidence;

describe("shopping guide release gate", () => {
	it("releases only when every required evidence check passes", () => {
		expect(evaluateShoppingGuideRelease(completeEvidence)).toEqual({
			verdict: "RELEASE",
			blockers: [],
		});
	});

	it.each(SHOPPING_GUIDE_RELEASE_CHECKS)("holds release when %s has not run", (check) => {
		expect(evaluateShoppingGuideRelease({
			...completeEvidence,
			[check]: "NOT_RUN",
		})).toEqual({
			verdict: "HOLD",
			blockers: [check],
		});
	});

	it("reports every failed or incomplete check instead of accepting partial evidence", () => {
		expect(evaluateShoppingGuideRelease({
			...completeEvidence,
			geminiVoice: "FAIL",
			paypalBoundary: "NOT_RUN",
		})).toEqual({
			verdict: "HOLD",
			blockers: ["geminiVoice", "paypalBoundary"],
		});
	});

	it.each([
		{},
		{ ...completeEvidence, privateNotes: "must not enter the public gate" },
		{ ...completeEvidence, privacyReview: "UNKNOWN" },
	])("fails closed for invalid evidence %#", (evidence) => {
		expect(evaluateShoppingGuideRelease(evidence)).toEqual({
			verdict: "HOLD",
			blockers: ["INVALID_EVIDENCE"],
		});
	});
});
