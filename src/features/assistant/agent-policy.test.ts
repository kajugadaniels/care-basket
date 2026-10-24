import { describe, expect, it } from "vitest";
import {
	getShoppingAgentActionRule,
	requireShoppingAgentAuthority,
	SHOPPING_AGENT_ACTIONS,
	SHOPPING_AGENT_POLICY,
} from "./agent-policy";

describe("CareBasket Shopping Guide policy", () => {
	it("is explicitly supervised", () => {
		expect(SHOPPING_AGENT_POLICY.identity).toMatchObject({
			id: "carebasket-shopping-guide",
			supervision: "HUMAN_REQUIRED",
		});
	});

	it("defines a rule for every declared action", () => {
		expect(Object.keys(SHOPPING_AGENT_POLICY.actions).sort()).toEqual([...SHOPPING_AGENT_ACTIONS].sort());
	});

	it("limits authority to catalog reads and proposals", () => {
		const authorized = SHOPPING_AGENT_ACTIONS.filter(
			(action) => getShoppingAgentActionRule(action).authority !== "NONE",
		);

		expect(authorized).toEqual([
			"SEARCH_APPROVED_CATALOG",
			"COMPARE_APPROVED_PRODUCTS",
			"INTERPRET_REQUEST",
			"SUGGEST_QUANTITY",
			"SUGGEST_SUBSTITUTION",
		]);
	});

	it.each([
		"CHANGE_DRAFT",
		"SUBMIT_REQUEST",
		"CHANGE_SUBMITTED_REQUEST",
		"APPROVE_REQUEST",
		"DECLINE_REQUEST",
		"START_CHECKOUT",
		"CAPTURE_PAYMENT",
		"MANAGE_FAMILY_ACCESS",
		"WRITE_CATALOG",
	] as const)("denies agent authority for %s", (action) => {
		expect(() => requireShoppingAgentAuthority(action)).toThrow(`no authority for ${action}`);
	});

	it("keeps price calculation outside the assistant", () => {
		expect(getShoppingAgentActionRule("CALCULATE_ESTIMATE")).toEqual({
			authority: "NONE",
			executor: "APPLICATION",
			confirmation: "NOT_APPLICABLE",
			description: "The server calculates estimates from approved prices; prices never enter the AI context.",
		});
		expect(SHOPPING_AGENT_POLICY.data.forbidden).toContain("prices, payment details, and PayPal identifiers");
	});

	it("requires the correct human or payment approval for every sensitive action", () => {
		expect(getShoppingAgentActionRule("SUBMIT_REQUEST").confirmation).toBe("REQUESTER");
		expect(getShoppingAgentActionRule("APPROVE_REQUEST").confirmation).toBe("MANAGER");
		expect(getShoppingAgentActionRule("START_CHECKOUT").confirmation).toBe("MANAGER");
		expect(getShoppingAgentActionRule("CAPTURE_PAYMENT").confirmation).toBe("PAYPAL_BUYER");
	});

	it("allows no personal history in assistant context", () => {
		expect(getShoppingAgentActionRule("READ_PERSONAL_HISTORY").authority).toBe("NONE");
		expect(SHOPPING_AGENT_POLICY.data.allowed).toEqual([
			"current request text or in-memory audio",
			"approved catalog summary without prices",
			"en-US locale",
			"assisted-adult audience marker",
		]);
	});
});
