# Release readiness

Source inspection: October 12, 2026. Baseline: clean local worktree at `34af0d9`.
This is a source audit, not a certification or successful release. No commands,
database queries, browser sessions, provider calls, or deployments were executed.

## Evidence vocabulary

- `CODE_PRESENT`: implementation inspected; runtime behavior remains unverified.
- `TESTS_WRITTEN_NOT_RUN`: test source exists; no result supplied for this release.
- `MANUAL_VERIFICATION_REQUIRED`: browser, database, or provider evidence needed.
- `BLOCKED`: a prerequisite is unresolved.
- `VERIFIED_BY_DEVELOPER`: reserved for a dated developer result with evidence.

No journey currently qualifies as `VERIFIED_BY_DEVELOPER` for Step 11.
Paths below are relative to the repository root. A feature's `server/` directory
contains its services/repositories; colocated tests use mocked providers/databases.

## Journey audit

| Journey | Implementation and tests | Boundary | Gap and required verification | Status |
| --- | --- | --- | --- | --- |
| Clerk sign-in and family creation | `src/app/(auth)/`, `features/family/components/CreateFamilyForm`, family actions/server; auth route, family actions/service/repository and setup page tests | Clerk identity establishes ownership; transactional owner membership, not client IDs | Verify real Clerk dialogs, redirects, sign-out, empty-family setup and duplicate submission | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Managed profiles and consent | `features/profiles/` form/delete dialog/actions/server; form, schemas, actions, service/repository tests | OWNER/MANAGER only; consent before creation; profile kind immutable; AI off by default | Verify keyboard validation, consent, deletion, device revocation; full family/account deletion UI is absent | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Pairing and revocation | `features/devices/`, `server/auth/device-session.ts`, pairing/device helpers and retention; devices actions/service/repository/dialog/polling tests | Cookie secret plus adult approval; expiring signed review; atomic POST completion; status GET validates cookie, 30/min, no-store, no completion | Verify two browsers, expired/wrong secrets, capacity, immediate revocation and trusted-IP configuration | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Catalog browsing | `features/catalog/components/CatalogBrowser`, catalog actions/server, `shop/products`; catalog service/repository/component/page tests | Shared nonpersonal catalog only; explicit price-free device DTO; child suitability filter; bounded cursor batches | Future-dated price approval must be excluded consistently; child catalog may intentionally be empty; verify infinite scrolling/images | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Picture request submission | `features/requests/components/DraftProvider`, `BasketReview`, requests actions/submission repository; draft, selection, basket, submission/service tests | Device actor; explicit Send; stable submission key; current server prices and family/profile scope | Verify draft controls, double Send, manager notification, authoritative snapshots; unsent draft is not durable | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Deterministic text shopping | `features/assistant/components/AssistantStart`, `ProposalReview`, keyword matcher, grounding, saved review; interpretation/evaluation/service/saved-review/component tests | No provider claim for local matching; encrypted device-bound review, original expiry, URL contains opaque lookup ID only | Verify multi-item matches, 12-item batches, automatic loading, unmatched words, refresh, revoked-device and cross-device review denial | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Gemini eligibility and consent | `lib/ai/eligibility.ts`, Gemini adapter, assistant service; eligibility/provider/service/actions tests | Global approval/model unset; flag alone insufficient; fresh adult consent; children never call provider | Application-wide child-accessible provider-terms issue unresolved. No genuine AI operation evidence | BLOCKED; TESTS_WRITTEN_NOT_RUN |
| Voice and fallback | `features/assistant/components/VoiceRecorder`, voice upload/service and `api/assistant/voice`; recorder/upload/route/service tests | Gesture-only microphone; assisted-adult eligibility and consent; Origin/rate limits; 60 seconds/2 MiB; audio discarded, never persisted | Real Gemini voice blocked; verify denial/unsupported recorder and text/picture alternatives, HTTPS microphone when eligibility is approved | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; BLOCKED |
| Manager request review | `features/requests/components/RequestUi`, `ManagerBasket`, server page-data/mutation repository; UI/actions/mutation/pages tests | Clerk role and family scope; revision conflict guards; optimistic changes roll back; payment lock prevents edits | Verify quantity totals, concurrent edits, repeat-click toast, removal, decline, focus and sound preferences | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Sandbox order creation | `features/checkout/server/service.ts`, pricing/attempt repository, `lib/paypal/orders.ts`; checkout service/actions/schema and PayPal orders tests | Adult only; server-owned USD totals; request mutex/open-payment guard; basket lock; stable creation identity; fixed Sandbox host | Configure credentials/migrations; verify retry recovery and other-family/device denial. Buyer approval remains off by default | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Capture and verification | Checkout capture service/repository/confirmation repository, `lib/paypal/capture.ts`; capture-service/confirmation/PayPal capture tests | Stable capture key; operation lease/fence; verified order/custom/reference IDs, exact cents/USD and final COMPLETED capture; atomic request/payment/audit | Unknown outcome remains unconfirmed and locked; real Sandbox success/pending/denial/timeout/recovery need evidence | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Signed webhook reconciliation | `api/webhooks/paypal`, checkout webhook service/payment-events, PayPal webhooks adapter; route/webhook-service/confirmation tests | Bounded body/headers; signature verification before writes; unique verified event ID; unfinished event retry; stored order verification; transactional state/event/audit | Public HTTPS delivery, signature, duplicates, out-of-order events, refunds/reversals and capture races not tested against PayPal | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Manager payment confirmation | CheckoutPanel/PaymentConfirmation/BuyerApproval and checkout DTO; component and capture/confirmation tests | Authenticated manager DTO only; client approval callback cannot mark paid; fresh status lookup; no payer details | Verify SDK v6 popup, refresh, exact totals, refunded/reversed display, usable dialog focus | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |
| Requester payment confirmation | Requests repository/service and RequestUi; service/repository/UI/pages tests | Own profile only; friendly status, no amounts, payer IDs or payment controls; fulfillment separate | Verify actual confirmed state reaches requester; reversal display; no automatic delivery transition | CODE_PRESENT; TESTS_WRITTEN_NOT_RUN; MANUAL_VERIFICATION_REQUIRED |

## Payment and isolation review

Reviewed checkout actions, service, pricing, attempt/capture/confirmation repositories,
payment-events, webhook service/route, SDK UI and PayPal adapters. Reviewed family,
profile, device, request, assistant and checkout actions and all four API handlers.

- Adult operations use Clerk-derived OWNER/MANAGER actors; devices cannot invoke them.
  Device operations derive family/profile from a freshly validated opaque session.
  Notifications GET uses read-only adult authentication. Pairing GET changes only
  the incidental rate limiter, not pairing records, cookies or device sessions.
- Shopping/payment queries use authenticated family scope; device history and
  reviews also use profile/device scope. Shared caches are limited to nonpersonal
  catalog data. The per-request membership cache is not a cross-user cache.
- Server Actions retain framework Origin checks. Voice upload additionally checks
  the configured origin. Webhooks deliberately use PayPal signatures, not browser
  authentication or browser CSRF checks.
- Checkout persists server prices, locks the basket and serializes payment changes.
  One open payment is guarded in the request transaction. Stable capture keys and
  fenced operation tokens prevent a stale worker from overwriting confirmed state.
- A signed event is not by itself proof of payment: reconciliation retrieves the
  stored Sandbox order and checks capture identity, currency, amount and completion.
  An invalid signature cannot create an event/payment update. Unknown results do
  not become PAID. Duplicate/unfinished events and terminal-state regressions have
  test coverage. Refund/reversal display remains separate from fulfillment.

No confirmed payment-security defect requiring checkout redesign was identified
in this inspection. Mocked tests do not prove database concurrency, cookie behavior,
provider delivery or SDK interoperability. Run the negative scenarios before release.

## Initial findings and Step 11 disposition

The audit was written before fixes. Dispositions below record subsequent source
changes, not successful execution.

Initial findings: nine total (one P0 release blocker, five P1 issues, three P2 issues;
no P3 polish-only work). Prioritize provider eligibility, actual payment verification
and privacy operations before cosmetic changes.

| Severity | Finding and impact | Disposition / evidence |
| --- | --- | --- |
| P0 release | Gemini global eligibility unresolved; deterministic matching is not genuine Gemini evidence | Gate preserved; obtain an application-wide approved decision before any provider use |
| P1 release | No current controlled Sandbox capture/webhook, hosting, migration or judge-access evidence | Developer checklist and two-browser guide; approval disabled by default |
| P1 privacy | `requests/server/input-retention.ts` excluded PAID requests; reconciliation touches updatedAt, delaying text cleanup | Include PAID using verified capturedAt instead; regression tests written, not run |
| P1 correctness | `catalog/server/repository.ts` accepted future-dated approval during browsing, unlike submission/checkout | Filter eligibility and selected price using the same per-query approval cutoff; tests written, not run |
| P1 release | Privacy page/contact and complete source license absent | Public page, approved contact and full MIT license for Daniels KAJUGA added; no self-service deletion claim |
| P1 privacy | Family/account deletion procedure and maintenance schedule lack operational evidence | Document manual requests and owner action; retained unmatched PaymentEvent metadata and backups require operator review |
| P2 accessibility | Footer disclosure and checkout explanatory/error paragraphs below 16px public/manager minimum | Token-sized 16px text; footer wrapping and focused source/component tests |
| P2 hardening | No baseline HTTP headers or unhandled-error hook | Baseline headers and opaque-ID logging; CSP deferred, browser compatibility still required |
| P2 documentation | Starter README, broken documentation link and future-payments disclosure | Updated actual architecture/setup/status/licensing and public disclosure |

## Source-only UI quality assessment

Provisional engineering scores, not rendered-page or WCAG ratings: accessibility
2/4, performance 3/4, responsive 3/4, tokens 3/4, anti-patterns 3/4: **14/20**.
The accessibility score is capped until browser/assistive-technology evidence exists.
No screenshots or live layouts were inspected in this release pass.

Anti-pattern assessment: existing blue/neutral token system, readable typography,
native controls and distinct requester/manager layouts are intentional. Do not
introduce gradient/glass decorations or redesign functional forms during hardening.

Source checks covered landing/sign-in triggers, setup/ProfileForm/ProfileChoices,
pairing/revocation dialogs, ShopShell, catalog, AssistantStart/ProposalReview,
VoiceRecorder, DraftSummary/BasketReview, request history/inbox, ManagerBasket and
CheckoutPanel/confirmation. New privacy content uses one h1, labelled sections,
visible links, a skip link and a narrow fluid reading column.

Positive patterns: native fieldset/legend validation, visible labels and focus styles,
dialog focus hooks, live quantity/status announcements, recognisable images with
alternatives, 48px controls/64px requester primary actions, reduced-motion CSS,
minmax/min-inline-size layouts and wrapping payment references. Catalog pagination
is bounded; image optimization remains same-origin; PayPal loads only when eligible.

Manual checks still required: Clerk/PayPal focus trap and restoration, screen readers,
contrast of rendered states, 20px requester body/18px floor across inherited styles,
200% zoom, long names/amounts, orientation and viewports 320/375/768/1024/1440px.
No WCAG conformance or performance budget achievement is claimed.

Suggested follow-up order: `/harden` operational/deletion gaps, `/audit` browser
accessibility, `/adapt` any measured overflow, `/optimize` measured latency, `/polish`.
Skills are recommendations; repository execution restrictions still apply.

## Demo-data and licensing review

Curated product data is published under ODbL, contents under DbCL where applicable;
reviewed photos retain source, CC BY-SA attribution and Cloudinary mapping.
See `public/products/ATTRIBUTION.md` and `/data-sources`. MIT covers application
source, not those datasets/photos. No child-suitability flags or source approvals
were changed. Fictional fixtures are for tests, not evidence of a real payment.

Secret files were deliberately not opened. No real credentials, personal recordings,
payer details or receipts were introduced. The developer must review the staged
changes, screenshot/video materials and demo accounts before publication.

## Release blockers and next evidence

1. Application-wide Gemini terms/model decision; genuine allowed AI demonstration.
2. Selected host/domain, Clerk configuration, dedicated Neon branch and all migrations.
3. Public signed webhook, controlled Sandbox capture and reconciliation evidence.
4. Full test/build results plus desktop/mobile/keyboard/screen-reader checks.
5. Verified manual privacy/deletion process, backup retention and maintenance ownership.
6. Judges' independent access, fictional family/profile setup and Sandbox buyer procedure.

The source license/contact decisions are resolved; operational privacy readiness is
not. Use `testing/end-to-end.md`, `deployment/demo-deployment.md` and
`submission-readiness.md`. Record dated results and evidence before changing status.
The older `.agents/hackathon.md` still lists license selection and earlier source
access/date uncertainty; the developer's October 12 approval resolves the license
decision, and submission-readiness records the newly readable official source.
No execution or security restrictions were changed.
