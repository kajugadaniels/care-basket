# CareBasket Shopping Guide — Step 8 Operational Readiness

**Status:** Implemented as privacy-safe structured events and a release-evidence contract  
**Depends on:** [Step 7 safety evaluation](agentic-commerce-step-7.md)  
**Primary boundary:** [`observability.ts`](../src/features/assistant/server/observability.ts)

## Purpose

Step 8 makes assistant failures visible without turning CareBasket into a surveillance system. Hosting-provider logs can be aggregated to answer whether the provider is available, whether outputs are being rejected, and whether requesters are reaching rate limits. This step adds no analytics service, database table, client tracking, or assistant authority.

## Event contract

| Event | Safe dimensions | Meaning |
| --- | --- | --- |
| `assistant.provider` | outcome, validated model label, duration bucket, optional token bucket | One completed provider attempt, after bounded retry behavior |
| `assistant.interpretation` | text or voice, outcome, optional allowlisted reason | The end-to-end interpretation path used provider output, local matching, fallback, or rejection |

Provider outcomes are `SUCCESS`, `UNAVAILABLE`, and `OUTPUT_INVALID`. Interpretation outcomes are `PROVIDER_SUCCESS`, `LOCAL_ONLY`, `FALLBACK`, and `REJECTED`. Reasons are limited to provider unavailable, output invalid, rate limited, consent changed, and empty audio.

Durations use four buckets: under one second, one to five seconds, five to fifteen seconds, and over fifteen seconds. Token counts use three buckets: under 1,000, 1,000–3,999, and 4,000 or more. Invalid measurements are omitted. The model label is limited to a short provider-safe identifier; any unexpected value becomes `unknown`.

## Privacy boundary

Operational events never accept or record:

- grocery words, prompts, transcripts, or audio;
- names, emails, profile, device, family, request, or review identifiers;
- cookies, tokens, IP addresses, consent timestamps, or signed proofs;
- catalog products, quantities, budgets, prices, or PayPal data;
- provider responses, errors, payloads, or stack traces.

Each log line receives a fresh random event ID only for deduplication. It is not tied to an actor or shopping request. The central logger reconstructs the JSON from known fields, so additional runtime properties are discarded. Logging is best effort and can never make a request fail.

## Operational review

For a release candidate, aggregate event counts in the hosting dashboard and review:

1. Provider availability: compare `SUCCESS` with `UNAVAILABLE` over the same period.
2. Output safety: investigate every `OUTPUT_INVALID` occurrence without inspecting or logging the original content.
3. Fallback health: confirm text requests continue through `FALLBACK` or `LOCAL_ONLY` when Gemini is unavailable.
4. Voice health: investigate repeated `REJECTED` voice outcomes by coarse reason.
5. Capacity: investigate repeated `RATE_LIMITED` outcomes before changing limits; never weaken authorization or input bounds to improve the number.
6. Performance: compare duration buckets rather than relying on averages that hide slow provider calls.

These events are diagnostic signals, not product analytics. They must not be joined to family data or used to profile requester behavior.

## Release evidence record

For each release candidate, record only:

| Field | Required evidence |
| --- | --- |
| Date and commit | UTC date and public commit hash |
| Environment | Local, preview, or production; never include URLs containing private lookup values |
| Automated verification | The developer's saved lint, type-check, focused safety-suite, full-suite, and build result |
| Manual safety evaluation | Pass/fail for every Step 7 release-gate scenario |
| Operational sample | Aggregate counts by event, outcome, reason, and bucket; no raw log lines |
| Reviewer and verdict | Reviewer name, unresolved blockers, and release or hold decision |

Store evidence with the private release process, not in public source control if it contains account, deployment, or provider details.

## Limitations

- Serverless logs are best effort and depend on the hosting provider's retention and aggregation.
- Events do not prove that a grocery match was semantically correct; Step 7 fixtures and manual review cover that risk.
- No alerting service or dashboard API was added. Adding another processor requires explicit approval and a privacy review.
- No event may trigger a draft change, request submission, manager decision, checkout, or payment action.

[Step 9 reviewed improvement](agentic-commerce-step-9.md) converts behavior categories into fictional deterministic fixtures that require explicit human review, without copying production requests or provider output.
