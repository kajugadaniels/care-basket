import type { ManagerDetailDto } from "./types";

export type ManagerReviewSummary = {
	requestedCount: number;
	suggestedCount: number;
	substituteCount: number;
	budget: {
		status: "BELOW" | "MATCHES" | "ABOVE";
		differenceMinor: number;
	} | null;
};

export function summarizeManagerReview(
	request: Pick<ManagerDetailDto, "items" | "subtotalMinor" | "budgetMinor">,
): ManagerReviewSummary {
	let requestedCount = 0;
	let suggestedCount = 0;
	let substituteCount = 0;

	for (const item of request.items) {
		if (item.origin === "SUGGESTED") suggestedCount++;
		else requestedCount++;
		if (item.isSubstitute) substituteCount++;
	}

	if (request.budgetMinor === null) {
		return { requestedCount, suggestedCount, substituteCount, budget: null };
	}

	const difference = request.subtotalMinor - request.budgetMinor;
	return {
		requestedCount,
		suggestedCount,
		substituteCount,
		budget: {
			status: difference < 0 ? "BELOW" : difference > 0 ? "ABOVE" : "MATCHES",
			differenceMinor: Math.abs(difference),
		},
	};
}
