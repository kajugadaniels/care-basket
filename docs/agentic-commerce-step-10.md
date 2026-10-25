# CareBasket Shopping Guide — Step 10 Release Evidence Gate

**Status:** Implemented as a strict fail-closed evidence contract; no release claim is recorded  
**Depends on:** [Step 9 reviewed improvement loop](agentic-commerce-step-9.md)  
**Primary gate:** [`release-gate.ts`](../src/features/assistant/release-gate.ts)

## Purpose

Step 10 defines the final decision boundary for the supervised Shopping Guide. A release is allowed only when every automated, manual, privacy, provider, isolation, confirmation, manager, and payment-boundary check has explicit `PASS` evidence. `FAIL`, `NOT_RUN`, missing fields, unknown fields, and malformed values always produce `HOLD`.

The gate evaluates statuses only. It does not run tests, contact providers, read logs, deploy code, enable Gemini or PayPal, persist evidence, or change application behavior.

## Required evidence

| Check | Required proof |
| --- | --- |
| `reviewedCorpus` | A developer explicitly reviewed the 40 fictional Step 9 cases and recorded approval. |
| `automatedVerification` | Lint, type check, focused evaluations, full test suite, and production build passed for the same commit. |
| `desktopJourney` | The two-browser requester/manager journey passed on a supported desktop browser. |
| `mobileJourney` | The requester journey passed on a supported mobile browser with touch and responsive layout checks. |
| `deviceIsolation` | Revoked, replaced, cross-profile, and expired device access failed closed. |
| `geminiText` | A consented adult text request used the approved paid-tier Gemini configuration and returned grounded catalog results. |
| `geminiVoice` | A consented adult voice request used HTTPS microphone access, discarded audio, and returned grounded catalog results. |
| `deterministicFallback` | Text and picture shopping remained usable with Gemini disabled or unavailable. |
| `explicitConfirmation` | Proposals, clarifications, suggestions, and substitutions changed no draft until the requester chose an item. |
| `managerBoundary` | The assistant could not submit, edit manager decisions, approve a request, or bypass manager review. |
| `paypalBoundary` | Assistant input could not start or capture payment; the separately reviewed PayPal Sandbox path remained manager-only. |
| `privacyReview` | Evidence contained no request text, transcripts, audio, personal data, credentials, tokens, provider payloads, or payment identifiers. |

## Developer-run sequence

Use one release candidate and one commit throughout the review:

1. Review and approve the fictional Step 9 corpus.
2. Run lint, type checking, the focused agent evaluations, the full suite, and the production build.
3. Complete the two-browser journey on desktop and mobile using fictional adults and Sandbox accounts.
4. Verify device revocation and private-review isolation.
5. Verify Gemini text, voice, and deterministic fallback separately. Provider success must be visible behavior, not inferred from source configuration.
6. Confirm every proposal still requires an explicit requester action and every manager/payment action remains outside assistant authority.
7. Review aggregate Step 8 signals and privacy boundaries without retrieving raw shopping content.
8. Mark each gate field `PASS`, `FAIL`, or `NOT_RUN`. Any value other than `PASS` holds the release.

## Private evidence record

Keep the completed evidence outside the public repository when it contains deployment or account context. Record only the UTC date, commit hash, environment label, browser/device versions, reviewer, each check status, aggregate operational counts, blockers, and final verdict.

Never record URLs containing private lookup values, prompts, transcripts, audio, names, emails, cookies, credentials, payment/order/capture identifiers, raw logs, provider responses, or screenshots containing personal information.

## Current verdict

`HOLD`. The Step 9 corpus is explicitly marked `PENDING_HUMAN_REVIEW`, the fixes from the latest failure report have not been rerun by the developer, and no same-commit desktop, mobile, live Gemini, fallback, isolation, or PayPal-boundary evidence was supplied for this step.

The source rulebook also still describes Gemini as globally disabled pending deployment review while the application contains non-null approval constants. That policy and source configuration must be reconciled explicitly before `geminiText`, `geminiVoice`, or `privacyReview` can receive `PASS`.

## Acceptance boundary

Step 10 code is complete when the strict evaluator, fail-closed tests, and evidence contract are present. The Shopping Guide is release-ready only when a developer supplies same-commit evidence and the evaluator returns `RELEASE`. A passing unit test proves the gate logic, not the production deployment.
