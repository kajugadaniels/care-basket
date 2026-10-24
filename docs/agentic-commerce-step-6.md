# CareBasket Shopping Guide — Step 6 Manager Decision Support

**Status:** Implemented  
**Depends on:** [Step 5 explainable suggestions](agentic-commerce-step-5.md)  
**Primary logic:** [`manager-review.ts`](../src/features/requests/manager-review.ts)

## Purpose

Step 6 gives a family manager a concise review ledger before checkout. It helps the manager notice what the requester selected, which products were optional suggestions, whether substitutions need attention, and how the current basket total compares with a stated per-request budget.

The ledger is decision support, not a recommendation. It does not approve, decline, edit, or pay for anything.

## Manager flow

1. The existing family-scoped request read returns the committed basket, provenance labels, substitution flags, snapshot total, and optional stated budget.
2. A deterministic helper counts requested products, suggested products, and substitutions from that request only.
3. When a budget exists, the helper compares integer minor units and reports whether the displayed total is below, equal to, or above it.
4. The existing sticky request summary displays the resulting notes above its human-controlled actions.
5. Optimistic quantity previews recalculate the notes immediately from the same display-only snapshot values. The server remains authoritative for saved quantities and checkout pricing.

## Trust boundaries

- No Gemini call is made and no generated prose is shown.
- No purchase history, other family requests, profile attributes, or demographic data enters the summary.
- Counts and budget differences come only from the currently authorized request DTO.
- Browser totals remain display-only. Quantity mutations still send only request ID, item ID, revision, and quantity; checkout re-prices and validates on the server.
- The notes contain no buttons or links and cannot trigger an action.
- Existing manager authorization and family-scoped repository reads are unchanged.

## Deliberately excluded

Step 6 does not recommend approval, automatically remove suggestions, select substitutes, change quantities, start checkout, contact the requester, or predict future needs. Every consequential action remains with the family manager.
