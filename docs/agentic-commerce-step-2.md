# CareBasket Shopping Guide — Step 2 Catalog Capabilities

**Status:** Internal capabilities implemented; no model function calling enabled  
**Depends on:** [Step 1 agent contract](agentic-commerce-step-1.md)  
**Implementation:** [`catalog-capabilities.ts`](../src/features/assistant/server/catalog-capabilities.ts)

## Purpose

Step 2 gives the CareBasket Shopping Guide three small, reusable ways to inspect the approved catalog:

1. Search by plain text and optional category.
2. Retrieve one approved product by SKU.
3. Compare two to four approved products by name, category, and package size.

These are internal server capabilities, not public endpoints and not Gemini tools. The existing provider continues to receive one bounded catalog context and return schema-constrained JSON without function calling.

## Capability contract

| Capability | Step 1 authority | Limit | Result |
| --- | --- | --- | --- |
| Search catalog | `SEARCH_APPROVED_CATALOG` | 1–12 products; default 6 | Price-free requester product cards plus `hasMore` |
| Get product | `SEARCH_APPROVED_CATALOG` | One validated SKU | One price-free requester product |
| Compare products | `COMPARE_APPROVED_PRODUCTS` | 2–4 unique SKUs | Products in requested order plus name/category/size differences |

Every capability validates a strict input object, calls the Step 1 policy guard, and delegates to the catalog service. It never queries Prisma directly.

## Security and privacy boundaries

- A freshly validated adult device actor is required by the catalog service.
- Legacy child, adult-manager, malformed, duplicate, and excessive inputs are rejected before data access.
- Only active catalog products with a currently approved demo price are eligible, but prices are never selected into capability results.
- Results contain only SKU, display name, category, size label, and reviewed image path.
- A second explicit projection at the assistant boundary prevents accidental field expansion.
- Search text is never placed in a shared cache key.
- SKU batch reads are shared-cache safe because SKUs are nonpersonal catalog identifiers.
- Missing comparison products produce one generic `NOT_FOUND` result.
- There are no writes, external catalog requests, family reads, provider calls, or payment operations.

## Performance decisions

Search reuses the existing bounded catalog page query and one-row lookahead. Product comparison performs one `IN` query instead of one lookup per SKU, then restores the requester's requested order in memory. Stable SKU reads use the existing catalog cache tag and explicit `hours` lifetime.

## Deliberately deferred

Step 2 does not:

- expose a new Route Handler or Server Action;
- allow Gemini to choose or invoke tools;
- modify the shopping-list draft;
- submit, approve, or decline a request;
- calculate or disclose prices;
- start checkout or capture payment;
- use personal history or household preferences.

The next approved step should connect these capabilities to a controlled, deterministic assistant orchestration layer while keeping the provider tool-free and every draft change requester-controlled.
