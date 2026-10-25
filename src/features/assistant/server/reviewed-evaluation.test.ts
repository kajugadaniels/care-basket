// @vitest-environment node
import { describe, expect, it } from "vitest";
import { interpretationSchema } from "@/lib/ai/schemas";
import { assistantCatalog } from "@/test/factories/assistant";
import { groundInterpretation } from "./grounding";
import { matchKeywords } from "./keyword-matcher";
import {
	REVIEWED_EVALUATION_CASES,
	REVIEWED_EVALUATION_METADATA,
} from "./__fixtures__/reviewed-evaluation";

describe("fictional shopping evaluation candidates", () => {
	it("keeps the public corpus review-ready, bounded and uniquely identified", () => {
		expect(REVIEWED_EVALUATION_METADATA).toEqual({
			authoredAt: "2026-10-25",
			source: "FICTIONAL_AUTHORED",
			containsProductionContent: false,
			reviewStatus: "PENDING_HUMAN_REVIEW",
		});
		expect(REVIEWED_EVALUATION_CASES).toHaveLength(40);

		const ids = REVIEWED_EVALUATION_CASES.map((scenario) => scenario.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const scenario of REVIEWED_EVALUATION_CASES) {
			expect(scenario.input.length).toBeLessThanOrEqual(160);
			expect(scenario.rationale.length).toBeLessThanOrEqual(160);
			expect(scenario.input).not.toMatch(/https?:|@|\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/i);
		}
	});

	it.each(REVIEWED_EVALUATION_CASES)("grounds reviewed case: $id", (scenario) => {
		const interpretation = matchKeywords(scenario.input, assistantCatalog);
		expect(interpretationSchema.safeParse(interpretation).success).toBe(true);

		const proposal = groundInterpretation(interpretation, assistantCatalog);
		expect(proposal.items.map(({ sku, quantity }) => ({ sku, quantity })))
			.toEqual(scenario.expectedItems);
		expect(proposal.unrecognized).toEqual(scenario.expectedUnrecognized);
		expect(proposal.questions).toEqual([]);
	});
});
