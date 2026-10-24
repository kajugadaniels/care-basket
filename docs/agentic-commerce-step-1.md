# CareBasket Shopping Guide — Step 1 Agent Contract

**Status:** Implemented policy contract; no new model tools or payment capabilities enabled  
**Policy version:** 2026-10-24  
**Engineering authority:** [AI rules](../.agents/ai.md) and [security rules](../.agents/security.md)  
**Machine-readable contract:** [`agent-policy.ts`](../src/features/assistant/agent-policy.ts)

## Purpose

The CareBasket Shopping Guide helps an assisted adult turn words, a short voice recording, or picture choices into an accurate shopping-list proposal. It reduces the work of finding catalog products while keeping every consequential decision with the requester, their authorized family manager, or PayPal's verified buyer flow.

It is a supervised assistant, not an autonomous buyer, merchant, caregiver, or source of professional advice.

## Experience promise

The requester should experience a short, predictable journey:

1. Choose **Speak**, **Type**, or **Pictures**.
2. Describe the groceries needed in ordinary language.
3. Review catalog-grounded matches and clearly labelled suggestions.
4. Answer one short clarification at a time when needed.
5. Adjust quantities, remove products, or undo a choice.
6. Explicitly send the completed list to the family manager.

Text and picture selection remain available whenever voice or AI is unavailable. The assistant does not hold an open-ended conversation, and it never hides uncertainty behind confident wording.

## Authority model

The policy distinguishes three levels of assistant authority:

| Authority | Meaning |
| --- | --- |
| `READ_ONLY` | The application may perform a bounded read of approved, nonpersonal catalog data. |
| `PROPOSE_ONLY` | The application may return a validated proposal with no business-state effect. |
| `NONE` | The assistant has no authority; an identified human or trusted server workflow owns the action. |

The assistant is limited to catalog search and comparison, request interpretation, and quantity or substitution proposals. It cannot change a draft, submit a request, modify a submitted basket, approve or decline a request, manage family access, write catalog data, start checkout, or capture payment.

## Confirmation boundaries

- A proposal changes nothing by itself.
- Adding, removing, or changing an unsent item requires an explicit requester interaction.
- Sending a shopping request requires a final requester confirmation.
- Editing, approving, or declining a submitted request requires an authorized family manager.
- Starting checkout requires a deliberate manager action.
- Capture remains inside the verified PayPal flow after Sandbox buyer approval.

Client controls may make these transitions feel immediate, but server authorization, validation, idempotency, and family isolation remain mandatory.

## Data boundary

The assistant may receive only the current request, a compact approved catalog summary without prices, the `en-US` locale, and the assisted-adult audience marker. It does not receive names, ages, family details, prior requests, purchase history, prices, payment data, PayPal identifiers, cookies, device secrets, or authorization tokens.

Audio stays in memory and is never persisted. The unsent draft stays in client state. The existing developer-approved private review exception remains encrypted, device-bound, and limited to its original 30-minute proof expiry.

## Relationship to future tools

Step 1 does not enable Gemini function calling. The current provider continues returning schema-constrained JSON with no tools. In Step 2, every proposed commerce tool must:

1. Map to an action in `SHOPPING_AGENT_ACTIONS`.
2. Call `requireShoppingAgentAuthority` before orchestration.
3. Narrow the action's data and result schema rather than broadening the policy.
4. Authenticate and authorize independently on the server.
5. Return catalog-grounded, bounded data.
6. Keep all mutations and payment operations outside assistant authority.

Adding a new action or expanding authority requires a deliberate policy change, matching tests, and review against the AI, security, privacy, catalog, request, and payment rules.

## Step 1 acceptance criteria

- One named, supervised agent has a narrowly defined purpose.
- Every planned action has an authority, executor, confirmation owner, and plain-language description.
- Assistant authority contains no business-state or payment mutation.
- Prices and personal history remain outside AI context.
- Requester, manager, and PayPal approval boundaries are explicit.
- Contract invariants have colocated tests.
- Existing AI, request, checkout, and payment behavior is unchanged.
