# CareBasket Shopping Guide — Step 5 Explainable Suggestions

**Status:** Implemented  
**Depends on:** [Step 4 requester guidance](agentic-commerce-step-4.md)  
**Primary grounding:** [`grounding.ts`](../src/features/assistant/server/grounding.ts)

## Purpose

Step 5 explains why an extra grocery appears before the requester decides whether to add it. The explanation is deterministic, catalog-grounded, and limited to the current shopping request. It never uses purchase history, family activity, demographic profiling, prices, or payment data.

## Requester flow

1. The existing interpretation pipeline labels every candidate as requested or suggested.
2. CareBasket resolves every candidate against the current approved catalog.
3. For a suggested product, server-owned logic compares its catalog category with categories explicitly requested in the same list.
4. The review shows a short **Why this idea** note inside the suggestion card.
5. The suggestion remains in its own section and enters the draft only after **Add to my list** is chosen.

Requested products do not receive suggestion explanations. Substitutions keep their separate warning, so a suggestion reason never hides uncertainty or substitution status.

## Trust boundaries

- Gemini does not write the displayed explanation and receives no new tool access.
- Explanations use only approved category metadata and the current request's grounded products.
- Explanations contain no price, link, medical advice, family data, or previous shopping behavior.
- The bounded explanation is stored only inside the encrypted, short-lived private review so it survives a reload.
- The encrypted review digest protects the explanation together with the other candidate metadata.
- Explanation text is not sent as authority to submission, approval, or checkout.

## Deliberately excluded

Step 5 does not rank suggestions from personal history, silently add products, change quantities, submit a request, notify a manager, approve a request, or start payment. Manager-side, current-request review notes are implemented separately in [Step 6](agentic-commerce-step-6.md).
