export const SHOPPING_AGENT_ACTIONS = [
	"SEARCH_APPROVED_CATALOG",
	"COMPARE_APPROVED_PRODUCTS",
	"INTERPRET_REQUEST",
	"SUGGEST_QUANTITY",
	"SUGGEST_SUBSTITUTION",
	"CALCULATE_ESTIMATE",
	"CHANGE_DRAFT",
	"SUBMIT_REQUEST",
	"CHANGE_SUBMITTED_REQUEST",
	"APPROVE_REQUEST",
	"DECLINE_REQUEST",
	"START_CHECKOUT",
	"CAPTURE_PAYMENT",
	"MANAGE_FAMILY_ACCESS",
	"WRITE_CATALOG",
	"READ_PERSONAL_HISTORY",
	"GIVE_REGULATED_ADVICE",
] as const;

export type ShoppingAgentAction = (typeof SHOPPING_AGENT_ACTIONS)[number];
export type ShoppingAgentAuthority = "READ_ONLY" | "PROPOSE_ONLY" | "NONE";
export type ShoppingAgentExecutor = "APPLICATION" | "REQUESTER" | "MANAGER" | "PAYMENT_SYSTEM" | "NONE";
export type ShoppingAgentConfirmation = "NONE" | "REQUESTER" | "MANAGER" | "PAYPAL_BUYER" | "NOT_APPLICABLE";

export type ShoppingAgentActionRule = {
	authority: ShoppingAgentAuthority;
	executor: ShoppingAgentExecutor;
	confirmation: ShoppingAgentConfirmation;
	description: string;
};

type ShoppingAgentPolicy = {
	version: string;
	identity: {
		id: "carebasket-shopping-guide";
		name: "CareBasket Shopping Guide";
		purpose: string;
		supervision: "HUMAN_REQUIRED";
	};
	data: {
		allowed: readonly string[];
		forbidden: readonly string[];
		retention: readonly string[];
	};
	experience: readonly string[];
	actions: Record<ShoppingAgentAction, ShoppingAgentActionRule>;
};

/**
 * Product-level authority for the assistant experience. Provider prompts and future
 * commerce tools must narrow this policy, never expand it. Server authorization and
 * validation remain mandatory even when an action is listed as readable or proposable.
 */
export const SHOPPING_AGENT_POLICY = {
	version: "2026-10-24",
	identity: {
		id: "carebasket-shopping-guide",
		name: "CareBasket Shopping Guide",
		purpose: "Turn an adult requester's words, voice, or picture choices into a catalog-grounded shopping-list proposal for their review.",
		supervision: "HUMAN_REQUIRED",
	},
	data: {
		allowed: [
			"current request text or in-memory audio",
			"approved catalog summary without prices",
			"en-US locale",
			"assisted-adult audience marker",
		],
		forbidden: [
			"names, ages, and family details",
			"previous requests and personal history",
			"prices, payment details, and PayPal identifiers",
			"device secrets, cookies, tokens, and authorization data",
			"uncurated products, live inventory, stores, and delivery promises",
		],
		retention: [
			"never persist audio",
			"keep the shopping-list draft in client state until send",
			"expire an encrypted private review within 30 minutes without extending its original proof",
		],
	},
	experience: [
		"Use short, familiar language and ask one clarification question at a time.",
		"Keep requested products separate from clearly labelled suggestions and substitutions.",
		"Let the requester review, adjust, reject, and undo choices before sending.",
		"Keep text and picture selection available when voice or AI is unavailable.",
		"Use one clear primary action and preserve recoverable input after a failure.",
	],
	actions: {
		SEARCH_APPROVED_CATALOG: {
			authority: "READ_ONLY",
			executor: "APPLICATION",
			confirmation: "NONE",
			description: "Search a bounded, approved catalog summary without prices or personal data.",
		},
		COMPARE_APPROVED_PRODUCTS: {
			authority: "READ_ONLY",
			executor: "APPLICATION",
			confirmation: "NONE",
			description: "Compare names, categories, and package sizes from approved catalog records.",
		},
		INTERPRET_REQUEST: {
			authority: "PROPOSE_ONLY",
			executor: "APPLICATION",
			confirmation: "REQUESTER",
			description: "Produce a validated, catalog-grounded proposal that has no business-state effect.",
		},
		SUGGEST_QUANTITY: {
			authority: "PROPOSE_ONLY",
			executor: "APPLICATION",
			confirmation: "REQUESTER",
			description: "Suggest a bounded quantity that the requester can adjust before adding.",
		},
		SUGGEST_SUBSTITUTION: {
			authority: "PROPOSE_ONLY",
			executor: "APPLICATION",
			confirmation: "REQUESTER",
			description: "Offer a clearly labelled catalog substitute without replacing the original automatically.",
		},
		CALCULATE_ESTIMATE: {
			authority: "NONE",
			executor: "APPLICATION",
			confirmation: "NOT_APPLICABLE",
			description: "The server calculates estimates from approved prices; prices never enter the AI context.",
		},
		CHANGE_DRAFT: {
			authority: "NONE",
			executor: "REQUESTER",
			confirmation: "REQUESTER",
			description: "Only an explicit requester interaction changes the unsent client-side draft.",
		},
		SUBMIT_REQUEST: {
			authority: "NONE",
			executor: "REQUESTER",
			confirmation: "REQUESTER",
			description: "Only the requester can send a fully reviewed list through the validated submission action.",
		},
		CHANGE_SUBMITTED_REQUEST: {
			authority: "NONE",
			executor: "MANAGER",
			confirmation: "MANAGER",
			description: "Only an authorized family manager can change a submitted request.",
		},
		APPROVE_REQUEST: {
			authority: "NONE",
			executor: "MANAGER",
			confirmation: "MANAGER",
			description: "Only an authorized family manager can approve a request.",
		},
		DECLINE_REQUEST: {
			authority: "NONE",
			executor: "MANAGER",
			confirmation: "MANAGER",
			description: "Only an authorized family manager can decline a request.",
		},
		START_CHECKOUT: {
			authority: "NONE",
			executor: "MANAGER",
			confirmation: "MANAGER",
			description: "Only an authorized manager can deliberately begin the checkout flow.",
		},
		CAPTURE_PAYMENT: {
			authority: "NONE",
			executor: "PAYMENT_SYSTEM",
			confirmation: "PAYPAL_BUYER",
			description: "The verified payment flow captures only after PayPal Sandbox buyer approval.",
		},
		MANAGE_FAMILY_ACCESS: {
			authority: "NONE",
			executor: "MANAGER",
			confirmation: "MANAGER",
			description: "The assistant cannot manage profiles, devices, consent, roles, or family membership.",
		},
		WRITE_CATALOG: {
			authority: "NONE",
			executor: "NONE",
			confirmation: "NOT_APPLICABLE",
			description: "The assistant cannot create, edit, price, approve, or delete catalog records.",
		},
		READ_PERSONAL_HISTORY: {
			authority: "NONE",
			executor: "NONE",
			confirmation: "NOT_APPLICABLE",
			description: "The assistant receives no names, family context, past requests, or purchase history.",
		},
		GIVE_REGULATED_ADVICE: {
			authority: "NONE",
			executor: "NONE",
			confirmation: "NOT_APPLICABLE",
			description: "The assistant does not provide medical, dietary, financial, or legal advice.",
		},
	},
} as const satisfies ShoppingAgentPolicy;

export function getShoppingAgentActionRule(action: ShoppingAgentAction): ShoppingAgentActionRule {
	return SHOPPING_AGENT_POLICY.actions[action];
}

export function requireShoppingAgentAuthority(action: ShoppingAgentAction): ShoppingAgentActionRule {
	const rule = getShoppingAgentActionRule(action);

	if (rule.authority === "NONE") {
		throw new Error(`CareBasket Shopping Guide has no authority for ${action}.`);
	}

	return rule;
}
