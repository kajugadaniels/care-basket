import { describe, expect, it } from "vitest";
import { makeManagerRequest, requestIds } from "@/test/factories/requests";
import { summarizeManagerReview } from "./manager-review";

describe("manager request review summary", () => {
	it("summarizes only the current basket's origins, substitutions and budget position", () => {
		const request = makeManagerRequest({ budgetMinor: 1_000, subtotalMinor: 1_200 });
		request.items.push({
			...request.items[0],
			id: requestIds.other,
			sku: "demo-bread",
			origin: "SUGGESTED",
			isSubstitute: true,
		});

		expect(summarizeManagerReview(request)).toEqual({
			requestedCount: 1,
			suggestedCount: 1,
			substituteCount: 1,
			budget: { status: "ABOVE", differenceMinor: 200 },
		});
	});

	it.each([
		[400, "BELOW", 100],
		[500, "MATCHES", 0],
	] as const)("reports a %s subtotal as %s budget", (subtotalMinor, status, differenceMinor) => {
		expect(summarizeManagerReview(makeManagerRequest({ budgetMinor: 500, subtotalMinor })).budget)
			.toEqual({ status, differenceMinor });
	});

	it("does not invent budget guidance when the requester gave no budget", () => {
		expect(summarizeManagerReview(makeManagerRequest()).budget).toBeNull();
	});
});
