# CareBasket Shopping Guide — Step 9 Reviewed Improvement Loop

**Status:** Implemented as a fictional deterministic corpus pending explicit human review  
**Depends on:** [Step 8 operational readiness](agentic-commerce-step-8.md)  
**Primary suite:** [`reviewed-evaluation.test.ts`](../src/features/assistant/server/reviewed-evaluation.test.ts)

## Purpose

Step 9 turns aggregate operational signals into safer regression coverage without collecting production shopping content. A person reviews a failure category, writes a new fictional scenario that represents the behavior, records the intended catalog-grounded result, and adds it to the deterministic evaluation suite.

This is an improvement process, not online learning. CareBasket does not train a model, copy user requests into tests, store provider output, or change assistant behavior automatically.

## Review workflow

1. Review only the allowlisted aggregate outcomes and buckets defined in Step 8.
2. Identify a behavior category, such as a package conversion, partially unmatched list, or instruction-like phrase.
3. Write a short fictional input from scratch. Never copy or lightly edit a request, transcript, log line, provider response, name, identifier, or payment detail.
4. Record the expected catalog SKU, bounded quantity, unresolved text, and a concise rationale.
5. Have a person review the scenario for privacy, realism, catalog grounding, and the assistant authority boundary.
6. Add the approved case to the committed fixture corpus and run the focused evaluation plus the normal release checks.
7. If the new case fails, change production behavior only after reviewing its effect on existing safety scenarios. Never weaken an expected result merely to make a release pass.

## Fixture contract

Every reviewed case contains:

- a stable descriptive ID;
- one fictional shopping input of at most 160 characters;
- exact expected SKU and quantity pairs;
- exact unresolved phrases;
- a short human-review rationale.

The initial corpus contains 40 fictional candidates. Its metadata states that its source is `FICTIONAL_AUTHORED`, that it contains no production content, and that review remains pending until a developer explicitly approves the cases. Automated checks enforce the case count, unique IDs, bounded text, valid interpretation schema output, catalog grounding, and exact deterministic results.

## Privacy and authority boundaries

- No production prompt, voice transcript, audio, private review, family record, log line, or provider response enters the corpus.
- No email, URL, UUID, token, payment identifier, name, or other personal detail is needed in an evaluation input.
- Aggregate metrics may reveal that a class of failure exists; they are never joined back to an actor or request.
- Fixtures test proposal quality only. They cannot mutate a draft, send a request, decide for a manager, start checkout, or capture payment.
- A reviewed fixture does not authorize Gemini, alter deployment eligibility, or prove live provider behavior.

## Release evidence

For each added case, record privately who reviewed it, why the fictional scenario was introduced, the related aggregate category, and the release candidate where it passed. Store aggregate counts, not raw logs. The committed fixture and test result are the public technical evidence.

## Acceptance boundary

Step 9 code is complete when the fictional corpus and focused suite are present. Its release gate is complete only after a developer reviews the cases, changes the metadata to record that explicit approval, runs the focused suite, and resolves any regression without weakening the Step 7 safety gate. The process remains manual and privacy-preserving; automatic fixture generation, production-content harvesting, model fine-tuning, and behavioral changes driven directly by telemetry are out of scope.
