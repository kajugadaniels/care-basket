# Testing

**Purpose:** Define a practical test strategy for CareBasket's highest-risk behaviour: authorization, family isolation, pairing, AI output, and payments.
**Applies to:** Writing or changing tests, and the end of every coding task.
**Related:** [workflow.md](workflow.md), [security.md](security.md), [payments.md](payments.md), [ai.md](ai.md), [accessibility.md](accessibility.md)
**Last reviewed:** 2026-10-08

---

## 1. Execution rule

> Agents write and maintain tests. **Agents never run tests, lint, type checks, builds, or formatters.** At the end of every task, agents list the exact commands for the developer ([workflow.md § 7](workflow.md#7-completion-report)) and never claim results they have not been given.

## 2. Tooling

- Vitest 4 with the `jsdom` environment for components, and the Node environment for server logic (a per-file `// @vitest-environment node` comment, or Vitest `projects` if the developer prefers configuration-level separation; check the installed Vitest docs).
- React Testing Library and `@testing-library/jest-dom` matchers.
- Current gaps (the developer decides; agents do not install):
  - There is no `vitest.config.mts` and no `test` script yet. A minimal config sets `test.environment: 'jsdom'`, a setup file importing `@testing-library/jest-dom/vitest`, and a `resolve.alias` for `@` → `./src`.
  - `@vitejs/plugin-react` and `vite-tsconfig-paths`, which the Next.js Vitest guide recommends, are **not installed**. Try the minimal config first; if the first run fails on JSX transform or path aliases, the developer approves and installs them.
  - `@testing-library/user-event` is not installed; it is recommended for realistic interaction tests.
  - No end-to-end runner (Playwright) is installed; critical journeys are covered by the manual script in §7 until one is approved.

## 3. What to test at each layer

| Layer | Test type | Notes |
| --- | --- | --- |
| `src/lib/money.ts`, `format.ts`, schemas | Unit | Pure functions; exhaustive edge cases |
| `features/*/server/service.ts` | Unit, with repositories and providers faked | The main place for business rules, transitions, and authorization |
| `src/server/auth/*` | Unit | Actor resolution, role checks, device session validation |
| Server Actions and Route Handlers | Unit | Call the exported function with mocked actor and service; assert validation, status codes, and response shapes |
| `features/*/components/*` (Client Components and synchronous Server Components) | React Testing Library | Query by role and accessible name; assert states |
| Async Server Components (pages) | Not unit-tested | Keep them thin; covered by the journey script in §7 |
| `src/lib/paypal`, `src/lib/ai`, `src/lib/open-prices`, `src/lib/open-food-facts` | Unit with stubbed `fetch` or SDK | Request shape, headers (including User-Agent), timeouts, retries, error mapping, response parsing |
| `scripts/catalog/*` logic | Unit, with recorded API fixtures | Keep script entry files thin; test the normalizer and verifier functions they call. Fixtures are small, anonymized excerpts with contributor fields removed. |

- Mock at module boundaries (`vi.mock('@/server/auth/actor')`, a fake `ShoppingAssistantProvider`, a fake PayPal client). Never mock the code under test.
- Unit tests never touch the network or a real database. Real Neon, PayPal Sandbox, and Gemini are exercised only in the developer's manual runs.
- Use factories (`makeActor`, `makeRequest`) in `src/test/factories/` instead of large inline fixtures. All data is fictional.

## 4. Required test suites

| Area | Must cover |
| --- | --- |
| **Authorization** | Every row of the permission matrix in [authentication.md § 9](authentication.md#9-server-side-permission-verification): allowed actors succeed; every other actor gets `UNAUTHENTICATED`, `FORBIDDEN`, or `NOT_FOUND` |
| **Family isolation** | An adult or device from family A gets `NOT_FOUND` for every family-B object (request, profile, device, payment); repository functions require `familyId` |
| **Pairing** | Code format and uniqueness; expiry; single use; reject without the pairing cookie; reject wrong secret; adult rate limit; `APPROVED → COMPLETED` only once; revoked device rejected on next request; idle and absolute expiry |
| **Input validation** | Each schema: valid input, boundary values (lengths, 1 and 20 quantities), extra fields rejected, wrong types, invalid UUIDs |
| **AI output validation** | Malformed JSON, schema violations, unknown SKUs grounded out, duplicate SKUs merged, quantity limits, low confidence not added, suggested items labelled and capped, substitution flagged, clarification text with prices replaced by the template, injection fixtures (user text and catalog names) produce only catalog items, `CHILD` and AI-disabled profiles never call the provider, deterministic keyword fallback, timeout and retry budget |
| **Units and sizes** | Metric and U.S. conversions; variant selection with least excess ("two kilos of rice", "three bars of soap"); size clarification when ambiguous or more than 25% off; 20-pack cap |
| **Budget fitting** | Optional suggestions removed first, most expensive first; suggested quantities reduced; requested items never removed; over-budget prompt; $1–$500 validation; uses `DemoMerchantPrice` only |
| **Catalog and U.S. verification** | Recorded Open Prices fixtures: every rule in [catalog.md § 5](catalog.md#5-establishing-us-associated-price-observations) (non-U.S., null country, online location, non-USD, category type, duplicate, per-kilogram, future date, price bounds); normalization and skip reasons; barcode normalization; deduplication; idempotent upserts; API failure leaves data unchanged; demo-price median and basis; seed file validation |
| **Design tokens** | `src/app/design-tokens.test.ts` checks the contrast pairs in [design.md § 3.2](design.md#32-verified-contrast-wcag-2x-formula-computed-2026-10-08) |
| **Payments (mocked PayPal)** | Server-computed amount equals basket; price change → `CONFLICT`; device actor rejected; repeat start returns same order; capture success; capture `PENDING`; declined; amount, currency, or `custom_id` mismatch not marked paid; repeat capture is a no-op; cancel checkout; request cannot become `PAID` twice |
| **Webhooks** | Invalid signature → 400 and no processing; missing webhook ID → reject; duplicate event → 200, no change; out-of-order events never move status backwards; unknown order stored and acknowledged |
| **Route Handlers** | Status codes and envelopes per [api.md § 4](api.md#4-response-and-error-format); Origin check; body size and MIME limits for audio |
| **Components** | Loading, empty, error, success, and disabled states; accessible names; keyboard operation; live-region announcements |

## 5. Conventions

- Colocate tests: `service.ts` → `service.test.ts`; `Button.tsx` → `Button.test.tsx`.
- Name tests by behaviour: `it('returns NOT_FOUND for a request in another family')`.
- One behaviour per test; arrange, act, assert.
- Use fake timers for expiry logic; never `sleep`.
- No snapshot tests for UI; assert on roles, text, and states.
- Tests must be deterministic: no real time, randomness, or network without control.
- A bug fix includes a test that would have failed before the fix.

## 6. Accessibility checks

- Component tests use role-based queries (`getByRole('button', { name: 'Send to Anna' })`); if an element cannot be found by role and name, fix the component.
- Automated axe checks require approval of a package such as `vitest-axe`; until then, the developer runs browser tooling (axe DevTools or Lighthouse).
- Manual checks before each milestone follow [accessibility.md § 12](accessibility.md#12-acceptance-criteria): keyboard-only, VoiceOver, TalkBack, 200% zoom, 320px width, reduced motion.

## 7. Critical journeys (manual end-to-end script)

The developer runs these against a local or preview deployment with Sandbox credentials before every milestone and before submission. Use two browser windows: a normal window as the manager and a private window as the requester's device.

1. Sign up as a manager; create a family; set the display name.
2. Add an `ASSISTED_ADULT` profile with consent.
3. In the private window, open `/connect`; enter the code in the manager window; approve; the device lands on `/shop`.
4. Enable AI for the profile with consent. On the device, create a request by voice ("two kilos of rice, one litre of milk, and three bars of soap"), one by text describing an occasion with a budget ("breakfast for four, under $20"), and one by pictures only. Check that suggestions are marked and that clarifications are answered by tapping.
5. As the manager, review, change a quantity, and pay with a Sandbox personal account.
6. Confirm the manager sees "Paid", the device shows the confirmation, and delivery shows as not started (demo).
7. Use the demo control to simulate delivery; confirm both views update separately.
8. Revoke the device; confirm the device shows the reconnect screen on its next action.
9. Check the PayPal Sandbox dashboard and webhook delivery log for the transaction.
10. Confirm that every price is labelled "Demo price", and that `/data-sources` shows the Open Food Facts and Open Prices attribution and licenses.
11. Repeat steps 3–6 on a phone-sized viewport, a tablet, and a desktop, and with a keyboard only.

## 8. Commands for the developer

Agents include the relevant subset of these in the completion report:

```bash
npm run lint
npx tsc --noEmit
npx vitest run                         # all tests, once
npx vitest run src/features/checkout  # a folder
npm run build
```

## 9. Prohibited patterns

- Running any test, lint, type-check, or build command as an agent
- Claiming tests pass without developer-supplied output
- Tests that call real PayPal, Gemini, Clerk, or Neon
- Real personal data or real credentials in tests or fixtures
- Skipping or weakening a failing test to make it pass

## 10. Acceptance criteria

- [ ] New or changed logic has tests in the matching suite from §4.
- [ ] Security-relevant changes include authorization and isolation tests.
- [ ] Tests are deterministic and use fakes at module boundaries.
- [ ] The completion report lists the exact commands to run and says the tests were not executed.
