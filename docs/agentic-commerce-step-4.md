# CareBasket Shopping Guide — Step 4 Requester Guidance

**Status:** Requester integration implemented  
**Depends on:** [Step 3 controlled orchestration](agentic-commerce-step-3.md)  
**Interface:** [`ShoppingGuide.tsx`](../src/features/assistant/components/ShoppingGuide/ShoppingGuide.tsx)

## Purpose

Step 4 connects controlled catalog guidance to the existing assistant review without replacing natural-language interpretation. When CareBasket cannot match part of a request, the review keeps those words visible and offers one compact catalog search using the first unresolved phrase.

## Requester flow

1. The existing text or voice pipeline validates, grounds, signs, saves, and restores the review as before.
2. If unresolved words remain, the requester may edit the first phrase and deliberately choose **Find groceries**.
3. The authenticated Server Action validates the strict Step 3 operation and resolves a fresh device actor.
4. One result stays a proposal. Two to four results become one server-written comparison question. Larger bounded results remain a proposal grid.
5. Results use the existing price-free product cards and quantity controls.
6. Nothing enters the draft until the requester chooses **Add to my list** on a specific card.

No guide appears when the original interpretation resolved every phrase, keeping the normal review focused.

## Security, privacy, and resilience

- The Server Action authenticates on every call and rejects unknown operations, ownership fields, duplicate SKUs, and unsafe search text before service work.
- The assistant service rejects historical child devices before orchestration. Catalog services independently enforce the adult-device boundary.
- Search and comparison return only approved catalog SKU, name, category, size, and image fields. They expose no prices, family data, history, proofs, or payment information.
- Prompt-like search text remains data and cannot select another operation.
- The input remains available after no matches or failure. Failures are focused inline and never replace already visible products.
- The loading state appears only on the initiating button. There is no duplicate progress message.
- Gemini still has no tools and is not called by guided catalog search.

## Deliberately deferred

Step 4 does not personalize from history, mutate or persist the draft on the server, submit a request, notify a manager, calculate prices, or touch checkout. Catalog-grounded, requester-confirmed explanations are implemented separately in [Step 5](agentic-commerce-step-5.md).
