# Payments (PayPal Sandbox)

**Purpose:** Define an accurate, tamper-resistant PayPal payment workflow in which only a family manager pays, the server decides every amount, and "paid" is never confused with "delivered".
**Applies to:** Baskets, prices, checkout, capture, webhooks, payment status display.
**Related:** [security.md § 11](security.md#11-payment-tamper-resistance), [database.md § 5](database.md#5-planned-models), [api.md § 6](api.md#6-idempotency-for-sensitive-mutations), [testing.md](testing.md), [hackathon.md](hackathon.md)
**Last reviewed:** 2026-10-12

---

## 1. Principles

1. **The server owns money.** Amounts come from the database catalog, never from the browser or the AI.
2. **Only family managers pay.** Device sessions can never create, approve, or capture a payment.
3. **Payment is voluntary.** The manager reviews, edits, declines, or pays.
4. **Verified, not assumed.** A payment is confirmed only after the server captures it and verifies the result with PayPal.
5. **Paid ≠ delivered.** Payment status and fulfillment status are separate fields, shown separately.
6. **AI never touches payments.** It has no role in pricing, authorization, or capture.

## 2. Environment and SDKs

- **Sandbox only.** `PAYPAL_ENVIRONMENT` must be `sandbox`; `src/lib/env/server.ts` validates it with `z.literal('sandbox')`. Going live requires a deliberate change to this document and the env schema.
- REST base URL for Sandbox: `https://api-m.sandbox.paypal.com`.
- **Server:** no PayPal server SDK is installed. The approved approach is a small typed REST client in `src/lib/paypal/` using `fetch` (OAuth client-credentials token, Orders v2, webhook signature verification). Adding `@paypal/paypal-server-sdk` instead requires developer approval.
- **Client:** `@paypal/react-paypal-js` v10, using the **v6 SDK entry** `@paypal/react-paypal-js/sdk-v6` (`PayPalProvider`, `PayPalOneTimePaymentButton`). Do not use the legacy v5 components (`PayPalScriptProvider`, `PayPalButtons`). Read the installed README before implementing. Use the official buttons only within the styling options PayPal supports; never build look-alike PayPal buttons.
- The client receives only `NEXT_PUBLIC_PAYPAL_CLIENT_ID` and the environment value (passed from validated server config). `PAYPAL_CLIENT_SECRET` and `PAYPAL_WEBHOOK_ID` never leave the server.
- The access token is cached in memory per server instance until shortly before it expires. It is never logged or sent to the client.
- **Step 10 rollout:** verified capture and signed webhook reconciliation are implemented, but `PAYPAL_BUYER_APPROVAL_ENABLED` defaults to `false`. Only the developer enables it after applying migrations, registering the Sandbox webhook, and validating capture/recovery. A valid private `PAYPAL_WEBHOOK_ID` and matching Sandbox app IDs are required before the server can enable the SDK. Never enable approval automatically or expose approval links as a workaround.
- The public and server client IDs must identify the same Sandbox app. Missing payment configuration fails only when checkout is used, not when unrelated routes are rendered.

## 3. Payment workflow

| Step | What happens | Where |
| --- | --- | --- |
| 1 | A managed profile submits a shopping request. | Device → `submitRequestAction` |
| 2 | The server validates SKUs, quantities (1–20), and availability, snapshots `DemoMerchantPrice` values into `BasketItem.unitPriceMinor`, records each item's origin, and computes the subtotal. | `requests` service, one transaction |
| 3 | The manager reviews items, quantities, prices, substitutions, and total; can edit quantities, remove items, or decline. | `/family/requests/[requestId]` |
| 4 | The manager chooses **Checkout** below the decline action and navigates to `/family/requests/[requestId]/checkout`. Preparation, official PayPal approval, cancellation, recovery, and verified results stay on this dedicated manager-only page. Navigation and page reads never create or capture an order. | Manager UI |
| 5 | `createOrder` calls `startCheckoutAction({ requestId })`. The server re-authorizes the adult and **re-prices** every item from `DemoMerchantPrice`. If a price changed or an item became unavailable, it updates the unlocked basket to current catalog data, returns `CONFLICT`, and asks the manager to review again. Otherwise, in one transaction, it locks the basket (`lockedAt`, conditional on it being unlocked), sets the request to `AWAITING_PAYMENT`, and creates a `Payment` (`CREATED`). Outside the transaction it creates the PayPal order and stores `paypalOrderId`. It returns only the order ID. | `checkout` service + `src/lib/paypal` |
| 6 | The manager approves the payment in the PayPal popup or modal. | PayPal |
| 7 | `onApprove` calls `captureCheckoutAction({ requestId, paypalOrderId })`. The server checks that the order ID belongs to this request's open payment, then calls capture with `PayPal-Request-Id: capture-<paymentId>`. | `checkout` service |
| 8 | The server verifies the capture result (§7). | `checkout` service |
| 9 | In one transaction: `Payment` → `CAPTURED` (or `PENDING`), store `paypalCaptureId` and `capturedAt`, request → `PAID` only if captured, record a `PaymentEvent`, write an audit entry. | `checkout` repository |
| 10 | The manager sees the verified result returned by the action. The requester's device shows the confirmation on its next status refresh. | UI |

Order creation body rules (Orders v2):

- `intent: "CAPTURE"`, one purchase unit, `custom_id` = our `Payment.id`, `reference_id` = basket ID.
- `amount.currency_code` = `USD`; `amount.value` = basket total; `amount.breakdown.item_total` equals the sum of the items.
- `items[]` include name (≤ 127 characters), `sku`, `quantity` (string), `unit_amount`, and `category: "PHYSICAL_GOODS"`.
- `payment_source.paypal.experience_context`: `shipping_preference: "NO_SHIPPING"` (fulfillment is simulated and no address is collected), `user_action: "PAY_NOW"`, `brand_name` identifying the demo merchant.
- Every create and capture request sends a `PayPal-Request-Id` header.

**Cancelling a checkout:** before approval or capture, the manager may cancel an untouched `CREATED` payment. `cancelCheckoutAction` marks it `VOIDED`, unlocks the basket, and returns the request to `PENDING_REVIEW` in one transaction. An approved, pending, captured, or capture-uncertain attempt is never cancelled or unlocked. The unused PayPal order is never captured.

Cancellation accepts only local `CREATED` attempts whose capture has never started. It first reconciles any known or uncertain PayPal create outside the transaction and refuses advanced, payment-bearing, or unknown outcomes. Local `VOIDED` means abandoned by CareBasket, not that PayPal voided an order or payment; Orders v2 has no generic order-void operation. Creation, cancellation, capture, and manual reconciliation share a persisted fenced lease. Once `captureStartedAt` is set, cancellation remains prohibited even after lease expiry. Unknown captures look up the original order before replaying the same capture key, and replay stops after five hours. Older ambiguous attempts remain locked for reconciliation, never an automatic new key or unlock.

## 4. Money handling

- All amounts are integers in **minor units** (cents) with an ISO 4217 currency code. The MVP supports `USD` only.
- **Checkout prices come only from `DemoMerchantPrice`.** Open Prices observations are reference data and are never used for totals, orders, or captures ([catalog.md § 6](catalog.md#6-observed-prices-vs-demo-merchant-prices)).
- A requester's per-request budget is context for the manager. It is never enforced, raised, or checked at checkout ([ai.md § 10.3](ai.md#103-budget-aware-suggestions)).
- Conversion to PayPal's decimal strings, and back, happens only in `src/lib/money.ts`, using integer arithmetic (no floating-point multiplication of prices).
- Totals are recomputed from items on the server every time; a stored subtotal is updated in the same transaction as its items.
- Display uses `Intl.NumberFormat` via `src/lib/format.ts`.
- Quantity limits: 1–20 per item, at most 30 distinct items per basket. Enforce with Zod and in the service.

## 5. Idempotency and concurrency

- **One open payment per basket.** Locking the basket with a conditional update (`lockedAt IS NULL`) is the mutex: only one checkout can start. A partial unique index on `Payment(basketId)` for open statuses SHOULD be added in SQL as a second guard ([database.md § 4](database.md#4-integrity-constraints-and-transactions)).
- **Repeat `startCheckout`** while a payment is `CREATED` or `APPROVED` returns the existing `paypalOrderId` instead of creating a new order.
- **Repeat `capture`** with the same `PayPal-Request-Id` is safe; if the payment is already `CAPTURED`, return the stored result without calling PayPal.
- **Request status** moves to `PAID` with a conditional update from `AWAITING_PAYMENT`, so a request can never be paid twice.
- Allowed transitions:

| Model | Transitions |
| --- | --- |
| `ShoppingRequest` | `PENDING_REVIEW → AWAITING_PAYMENT → PAID`; `AWAITING_PAYMENT → PENDING_REVIEW` (cancelled checkout or denied payment only; the basket is unlocked in the same transaction); `PENDING_REVIEW → DECLINED` (manager); `PENDING_REVIEW → CANCELLED` (requester) |
| `Payment` | `CREATED → APPROVED`; `CREATED/APPROVED → CAPTURED / PENDING / DENIED`; untouched `CREATED → VOIDED`; `PENDING → CAPTURED / DENIED`; verified refunds/reversals may reconcile open or captured attempts to `REFUNDED / REVERSED`; `REFUNDED → REVERSED` preserves the later reversal |

Any other transition throws `CONFLICT`.

## 6. Webhooks

Endpoint: `POST /api/webhooks/paypal`. Subscribe the Sandbox app to: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.DECLINED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED`.

Processing order:

1. Read the raw body incrementally with a 64 KB byte limit, enforced before full buffering; validate required signature headers. Do not require Clerk/device authentication or an Origin header.
2. **Verify the signature** by calling `POST /v1/notifications/verify-webhook-signature` with the `paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, and `paypal-transmission-time` headers, `PAYPAL_WEBHOOK_ID`, and the event exactly as received. Anything other than `verification_status: "SUCCESS"` → respond 400, log `webhook.verification_failed`, and stop. If `PAYPAL_WEBHOOK_ID` is missing, reject all events.
3. Parse the event with a Zod schema (only the fields we use).
4. **Deduplicate:** insert a minimal verified `PaymentEvent` keyed by unique `paypalEventId`. Only duplicates with `processedAt` set may stop with 200. A received but unfinished event must resume; processing failures return a retriable non-2xx response. Event completion and related payment/request/audit writes share one short transaction.
5. **Do not trust the event body for state.** Find our `Payment` from the related order ID, cross-check `custom_id`, then **re-fetch the order from PayPal** (`GET /v2/checkout/orders/{id}`) and apply its current state using the allowed transitions in §5. This makes out-of-order delivery harmless: a late `PENDING` event can never override `CAPTURED`.
6. Respond 200 only after durable handling. Unknown types and unmatched verified events are minimally stored and acknowledged. Refund/reversal resource IDs are not assumed to be order IDs: correlate stored capture IDs or validated relationships and verify current capture/refund resources through fixed Sandbox API paths. Approval events alone never mark requests paid. All responses have `Cache-Control: no-store`.

Notes:

- Events for orders we do not know are stored with `paymentId = null`, logged, and acknowledged.
- PayPal's Webhook Simulator sends mock events that may not pass signature verification. Test end to end with real Sandbox transactions.
- Store only a minimal event summary (IDs, type, status, amount, currency), never the full payload, which contains payer details.

## 7. What "paid" means: verification rules

A payment becomes `CAPTURED` only when **all** of these hold, using the capture response or the re-fetched order:

- The order ID matches `Payment.paypalOrderId`, intent is `CAPTURE`, `custom_id` equals `Payment.id`, and `reference_id` equals `Payment.basketId`.
- The order status is `COMPLETED` and the capture status is `COMPLETED`.
- The captured amount (converted to minor units) equals `Payment.amountMinor`, and the currency equals `Payment.currency`.
- There is exactly one final capture with a valid unique capture ID, bound to that order, and the payment was in `CREATED`, `APPROVED`, or `PENDING`.

A capture status of `PENDING` sets `Payment.status = PENDING` and leaves the request in `AWAITING_PAYMENT` until a verified `PAYMENT.CAPTURE.COMPLETED` arrives. Any mismatch leaves the payment unconfirmed, writes an audit entry `payment.verification_failed`, and shows the manager a calm message to contact support. It is never shown as paid.

A browser redirect, a client-side `onApprove` callback, or a URL parameter **never** marks anything paid.

The checkout page may show a short, reduced-motion-aware result animation only for the verified server state. Network errors and closed popups do not imply a declined payment or no charge: retain the uncertain-state copy and a recovery action. Every outcome keeps a **Back to request** link to the originating request details; payment outcomes never disappear automatically.

Recoverable PayPal errors (for example `INSTRUMENT_DECLINED`) keep the payment open so the manager can try another funding source; tell them "PayPal couldn't use that payment method. Please try again." `ORDER_ALREADY_CAPTURED` triggers a re-fetch and reconciliation.

## 8. User-facing states

| Situation | Manager sees | Requester sees |
| --- | --- | --- |
| Request waiting | "New request from Grandma — 6 items, $23.45" | "Sent to Anna. She'll look at it soon." |
| Checkout in progress | PayPal button, pending indicator | "Anna is looking at your list." |
| Payment pending at PayPal | "PayPal is processing this payment." | "Anna is paying. We'll tell you when it's done." |
| Payment confirmed | "Paid with PayPal on 14 Oct, 10:42. Transaction ID …" | "Your shopping is paid for. Anna paid on Tuesday." |
| Fulfillment (simulated) | Separate badge: "Delivery: Not started / Preparing / Delivered", within the disclosed test environment | Separate line: "Delivery: not arranged yet (demo)" |
| Declined | "You declined this request." | "Anna can't get this right now." |
| Payment failed | "Payment didn't go through. You were not charged." (only when verified) | No change; still "Anna is looking at your list." |

- Requesters never see PayPal, payment errors, transaction IDs, or item prices. The only amount a requester may see is the server-calculated estimated total against a budget they set for that request, labelled as demo prices ([design.md § 8](design.md#8-requester-interface-assisted-adults-and-children)).
- **Manager disclosure (developer-approved, 2026-10-11):** every `/family` page shares one visible, discreet layout notice: "Test environment — no real purchases". Within that area, use neutral labels such as "Price", "Unit price", "Line total", and "Basket total"; omit repeated demo-price badges and merchant/simulation notices. Prices remain approved `DemoMerchantPrice` values, never live retailer offers. Manager-facing prices outside that layout still require an explicit "Demo price" disclosure.
- This presentation exception does not change Sandbox-only payments, capture verification, requester disclosures, data attribution, or the requirement to identify simulated fulfillment controls explicitly (§10). Official payment components retain factual Sandbox identification.
- "Paid" and "Delivered" use different icons, words, and positions ([design.md § 5](design.md#5-component-patterns)).

## 9. Claims we must never make

- That CareBasket or PayPal checkout is an **escrow** service, or that money is "held until delivery".
- That orders are delivered, shipped, or fulfilled by a real merchant. Fulfillment is **simulated** for a **demonstration merchant** with **simulated products**.
- That real merchants or grocery stores are integrated, or that a simulated checkout orders products from a real retailer.
- That demo prices are real store prices, or that Open Prices observations are current, guaranteed, or store-specific prices.
- That PayPal operates, sponsors, or endorses CareBasket. PayPal appears only through official payment components and factual labels ([design.md § 1.3](design.md#13-brand-separation-mandatory)).
- That payments are live. They are **PayPal Sandbox** test payments.
- That buyer protection or refunds apply in any specific way.

These disclosures appear in the app (the shared family-layout notice in §8 replaces repeated manager notices), the README, the Devpost description, and the video ([submission.md](submission.md)).

## 10. Demonstration merchant and fulfillment

- The merchant is the developer's PayPal Sandbox business account, presented as **CareBasket Demo Market**. Products come from the curated catalog, and prices are approved demo prices ([catalog.md](catalog.md), [database.md § 8](database.md#8-seed-data)).
- `fulfillmentStatus` is advanced only by an explicit manager-side **"Demo: simulate delivery"** control, visible only when `DEMO_FULFILLMENT_CONTROLS=true`, and labelled as simulated.
- Payment events never change `fulfillmentStatus`, and fulfillment changes never change payment status.

## 11. Prohibited patterns

- Client-supplied prices, totals, currency, or item lists used for order creation
- Creating or capturing orders from the browser or from a device session
- Marking paid on redirect, on `onApprove`, or from an unverified webhook
- Floating-point money arithmetic
- Calling PayPal inside a database transaction
- Storing payer names, emails, addresses, or full webhook payloads
- Live PayPal credentials anywhere in the project
- AI involvement in amounts, approval, or capture

## 12. Acceptance criteria

- [ ] Only adult actors can start, cancel, or capture checkout; tests prove device sessions are rejected.
- [ ] Order amounts are recomputed from `DemoMerchantPrice` on the server and match the basket exactly; no code path reads `PriceObservation` for money.
- [ ] Capture verification checks order ID, `custom_id`, status, amount, and currency before marking paid.
- [ ] Webhooks are signature-verified, deduplicated, re-fetched, and safe in any order.
- [ ] The requester sees a clear confirmation only after verified capture, and fulfillment is shown separately as simulated.
- [ ] Tests with a mocked PayPal client cover success, pending, declined, mismatch, duplicate capture, and duplicate or out-of-order webhooks ([testing.md § 4](testing.md#4-required-test-suites)).
