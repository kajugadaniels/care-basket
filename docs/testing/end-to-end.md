# Developer-run end-to-end verification

Status: **MANUAL_VERIFICATION_REQUIRED**. No browser checks or test commands were
executed by the agent. Fill every Result cell with **Pass**, **Fail** or **Blocked**,
plus date, commit, environment, browser and a private evidence reference. Blank
cells are not passes. Never commit credentials, transcripts, payer details or raw logs.

## Preparation

1. Prepare an isolated development/preview/demo Neon branch, matching Clerk
   environment and Sandbox app, with migrations and reviewed catalog seeded.
2. Run the automated baseline below. Resolve failures before provider testing.
3. Use **browser M** (normal window) for the manager and **browser R** (a different
   browser or private session) for the requester. Keep the same host in both windows;
   `localhost` and `127.0.0.1` do not share cookies. Use HTTPS remotely.
4. Use fictional family `Maple Test Family`, manager display name `Alex`, assisted
   adult `Rose`, preset avatar. The developer supplies privately configured test
   authentication and a separate Sandbox personal buyer account; never publish them.
5. Keep Gemini disabled. The voice/AI happy path is BLOCKED until the application-wide
   eligibility/model decision is approved. Profile consent alone is insufficient.
6. Buyer approval remains disabled by default. An explicitly authorized isolated
   Sandbox verification is a prerequisite to enabling it on a judge-facing demo.
   If no controlled verification rollout has been approved, mark payment scenarios
   Blocked; do not bypass the gate or turn on a live PayPal environment.
7. Confirm the webhook is publicly reachable and signing configuration belongs to
   the same Sandbox app. Restrict access to every other test environment.

## Automated baseline (developer only)

From the repository root, with local credentials already configured privately:

```bash
npx prisma generate --config prisma7.config.ts
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

Generation creates ignored client files, not migrations. Build also generates the
client but neither migrates nor seeds. A build does not verify provider credentials.
Unit tests mock external services and database boundaries; no real calls belong in
Vitest. Keep the complete output privately and record the exact commit tested.

Coverage to inspect if a scenario fails:

| Concern | Existing suites |
| --- | --- |
| Auth and isolation | `src/server/auth/`, feature actions/service/repository tests |
| Pairing/GET limits/revocation | `src/features/devices/`, `src/app/api/pairing/status/`, device-session tests |
| Catalog/child eligibility | `src/features/catalog/`, submission-repository tests |
| Local matching/private refresh | `src/features/assistant/`, `src/lib/ai/eligibility.test.ts` |
| Send/idempotency/snapshots | `src/features/requests/server/submission-repository.test.ts`, BasketReview tests |
| Amount/currency/identity mismatch | `src/lib/paypal/capture.test.ts`, checkout pricing/service tests |
| Capture pending/denial/timeout/fencing | `src/features/checkout/server/capture-service.test.ts`, confirmation-repository tests |
| Webhook signature/duplicate/order/reversal | `src/app/api/webhooks/paypal/route.test.ts`, webhook-service tests |
| SDK and confirmation privacy | CheckoutPanel/BuyerApproval tests, requests service/UI tests |
| New release guards | Input-retention/repository tests, `src/instrumentation.test.ts`, `src/next-config.test.ts`, privacy/footer tests |

## Core two-browser journey

| # | Action | Expected result | Result / evidence |
| --- | --- | --- | --- |
| 1 | M: open `/`, choose Get Started and complete Clerk sign-up with the configured test identity | Clerk dialog is usable; no private requester/payment data exposed | |
| 2 | M: create the fictional family and manager display name | `/family` loads with owner membership, helpful empty state; no duplicate family from repeat submit | |
| 3 | M: `/family/members/add`, choose assisted adult, nickname/preset avatar and consent | Missing fields announce validation; valid profile appears; AI remains off | |
| 4 | R: `/connect`, start pairing | Six-digit code and expiry; HttpOnly pairing cookie in R only; no family session yet | |
| 5 | M: `/family/devices/connect`, enter code, review device, select Rose and approve | R completes through the separate POST action and reaches `/shop/assistant` via `/shop`; only Rose's session is granted | |
| 6 | R: Products in top navigation, search `rice`, change category, scroll near the end | Eligible products/photos load in bounded batches; no duplicate cards, prices or payment controls | |
| 7 | R: add two distinct pictured products, adjust quantities, open My List | Names, sizes, pictures and quantities remain correct; nothing sent yet | |
| 8 | R: explicitly Send once, then attempt a quick second click | Exactly one request; success heading announced/focused; stable submission identity prevents duplicates | |
| 9 | M: notification bell and `/family/requests`, open Rose's list | Waiting-for-review counter and requester identity agree; server-priced items/total visible | |
| 10 | M: change one quantity and save | Only that item reflects the operation; totals update optimistically, server confirms, no global Saving state; success toast is accessible; failure rolls back | |
| 11 | M: deliberately start checkout after reviewing totals | One persisted Sandbox order; basket locked against edit/decline/removal; snapshot amount matches display; requires approved controlled-test gate | |
| 12 | M: approve using the separate Sandbox personal buyer account | SDK v6 flow opens; no real account or money; popup approval alone does not mark paid | |
| 13 | M: allow server capture/verification to finish, then refresh status if uncertain | One verified final capture with exact USD cents/IDs; only this can mark PAID; unknown or pending is never shown as success | |
| 14 | Developer: inspect Sandbox webhook deliveries and matching minimal application event/state | Valid signature and 2xx; retries do not duplicate payment/audit transitions; private provider evidence matches the request | |
| 15 | M: refresh request detail/history | Confirmed Paid or accurate pending/refund/reversal state; correct amount/time/reference; no payer name/email | |
| 16 | R: own request history/details, refresh | Friendly verified confirmation; no amount, order/capture ID or payment controls; other profiles remain inaccessible | |
| 17 | Compare fulfillment before/after capture | Remains NOT_STARTED unless a separately implemented and deliberately operated simulated control changes it; payment never creates real delivery. Missing control is recorded, not fabricated | |
| 18 | M: `/family/devices`, confirm revoke Rose's device | Revoke succeeds once, row reflects revocation; no accidental other-device revocation | |
| 19 | R: navigate, reload, attempt catalog/review/history action | Next protected request shows reconnect/denial; prior in-memory pixels are not proof of ongoing access; no protected data fetched | |

## Text, saved review and voice alternatives

| Action | Expected result | Result / evidence |
| --- | --- | --- |
| Re-pair R; type `bread and milk` at `/shop/assistant` | Both terms represented; local matching honestly labelled internally, never claimed as Gemini | |
| Open review, scroll beyond the initial twelve matches | Bounded automatic loading, both terms represented fairly, quantities usable, no silent repeated fetch loop | |
| Reload `?review=` URL before expiry | Private review restored without new provider calls, plaintext/proof in URL, or expiry extension | |
| Try review URL from a different paired browser/profile/family | Same safe missing/recovery behavior as an absent review; no contents disclosed | |
| Wait beyond original 30-minute/proof expiry, then reload | Clear recovery to text/pictures; no extension or stale product submission | |
| Enter an unmatched item and retry with a supported word | Minimal unmatched message; original words preserved, no invented SKU | |
| Attempt voice with Gemini disabled, no consent or child actor | Provider not called; typed/picture fallback available; no microphone starts automatically | |
| Only after eligible deployment approval: start/stop adult test recording, deny permission, exceed limits, navigate away | Explicit gesture, visible timer/limit warning, bounded MIME/size, released tracks; no saved audio; fallback works. Until approved: Blocked | |

## Negative and recovery scenarios

Run only against your isolated test environment. Simulate destructive/network failures
through local mocked tests or an explicitly approved test setup; do not alter payment
rows or forge a successful callback. Keep prior-state evidence for no-write assertions.

| Scenario and procedure | Expected result | Result / evidence |
| --- | --- | --- |
| Pairing code: wait 10 minutes; try to approve old code and obtain a fresh one | Old code grants no session; restart possible | |
| Incorrect secret: use a code from R in another browser lacking R's cookie | No pairing information or completion; code alone is insufficient | |
| Status polling: exceed 30/min for one pairing, retry after limit | 429, appropriate Retry-After and no-store; no pairing transition from GET | |
| Signed out: access `/family/requests` and invoke manager operation | Sign-in/authorization required; device cookie is not enough | |
| Create a second fictional family in another manager browser; copy profile/request/payment/review URLs across families | NOT_FOUND/denial without existence or content leaks; no writes | |
| R: attempt manager checkout/edit/profile/device administration | No adult capability, even with valid device session | |
| Submit twice; refresh after lost submit response; reuse same key with altered input in mocked test | One original request; altered contents conflict, never reprice edited original silently | |
| Two managers start/capture the same basket nearly together | One open attempt, one successful capture; stale workers cannot overwrite winner | |
| Close popup or reload during checkout, reopen existing request and deliberately refresh status | Persisted attempt recovered; no automatic duplicate charge or false cancellation/unlock | |
| Provider timeout/pending/denial and a later confirmed response | Timeout stays unknown/locked; pending not paid; verified denial returns review; recovery uses lookup and same key | |
| Wrong amount, currency, custom/reference ID or capture ID in mocked provider response | No PAID state; no trusted client-supplied correction | |
| POST a small JSON notification without signing headers to your test webhook | 400, generic response; no PaymentEvent/payment write | |
| Oversized/malformed webhook payload (isolated test or route mock) | 413/400 before processing; no raw body logging | |
| Redeliver an actual signed Sandbox event using PayPal's delivery tooling | Acknowledged, no second state transition/capture; unfinished delivery resumes safely | |
| Deliver older pending/approval after completed event; refund/reversal through supported Sandbox tooling if available | No backward success regression; authoritative refund/reversal shown. Unavailable Sandbox setup: Blocked, rely on mocks only | |
| Missing webhook ID/secret/client mismatch in a separate private test configuration | Approval unavailable/fails closed; no live fallback or configuration value leakage | |
| Remove/expire/revoke device cookie; delete its managed profile | No new protected access, actions or private review retrieval | |
| Create a fictional child profile with no reviewed child-suitable catalog | Honest empty state; no unrestricted products, price, budget, voice or Gemini | |
| Approve AI setting with consent but leave deployment gate unset | Gemini stays blocked application-wide; deterministic text/pictures work | |

## Accessibility and responsive matrix

Check landing/Clerk dialogs, setup, profile fields, pairing, requester assistant/catalog/
review/basket/history, manager inbox/review/checkout/payment confirmation, privacy and
attribution. Record **Pass/Fail/Blocked per page**, browser and assistive technology.

| Check | Expected result | Result / evidence |
| --- | --- | --- |
| 320, 375, 768, 1024, 1440 CSS px; portrait and landscape | No horizontal scroll/clipped controls; long names/references and large totals wrap | |
| 200% zoom, larger OS font, increased line/word/letter spacing | No loss of labels, actions, amounts or dialog content; navigation remains reachable | |
| Keyboard Tab/Shift-Tab/Enter/Space/arrows/Escape | Visible logical focus, skip links; native selects/radios work; dialog traps/restores focus | |
| Invalid forms, Send, review changes, quantity/undo and payment outcomes | Errors associated and announced; focus moves appropriately; critical outcomes stay visible, not toast-only | |
| VoiceOver on macOS/iOS and TalkBack on Android | Headings/landmarks/labels/image alternatives/live updates intelligible, no repeated/spurious announcements | |
| Contrast checker, forced colors, reduced motion | Text 4.5:1 or better; controls/focus 3:1; meaning not color-only; no essential motion/sound | |
| Target and font measurement | Controls >=48px, requester primary actions >=64px; requester body target20px, floor18px; public/manager paragraphs >=16px | |
| Manager toasts muted/enabled, errors and successes | Optional short distinct gesture-enabled sounds, visible toggle; equivalent visual feedback and readable inline recovery | |
| HTTPS headers and integrations | nosniff/referrer/frame protections present; Clerk dialogs, PayPal approval, images and permitted microphone still work | |

## Release evidence and tooling decision

Manual workflow plus mocked Vitest is the current architecture. It is adequate to
start controlled verification, not to prove complete browser correctness or races in
a real database. No Playwright dependency, import or spec was added. If these checks
will run repeatedly, propose a separately approved maintained Playwright version
(Apache-2.0) and installation/browser policy; choose the version when approving it,
not from an unverified latest-version assumption.

Record commit, date, test totals/failures, host/database environment, header checks,
Sandbox transaction and signed-delivery references privately. Update the
[readiness audit](../release-readiness.md) only for the specific evidence supplied.
