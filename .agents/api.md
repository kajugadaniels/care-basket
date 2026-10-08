# Server Entry Points: Server Actions and Route Handlers

**Purpose:** Make every server entry point consistent, typed, validated, authorized, and safe to call twice.
**Applies to:** Every Server Action and Route Handler.
**Related:** [architecture.md § 4](architecture.md#4-server-actions-and-route-handlers), [security.md](security.md), [payments.md](payments.md), [ai.md](ai.md)
**Last reviewed:** 2026-10-08

---

## 1. Shape of every entry point

Each Server Action and Route Handler follows the same five steps and contains **no business logic**:

1. **Resolve the actor** (`requireAdult()` or `requireDevice()`), unless the endpoint is a verified webhook or a public pairing start.
2. **Rate-limit** where [security.md § 8](security.md#8-rate-limiting-and-brute-force-protection) requires it.
3. **Validate input** with the feature's Zod schema (`safeParse`).
4. **Call one service function**, passing the actor and the validated input.
5. **Map the result** to an `ActionResult` (actions) or the JSON envelope (route handlers). Revalidate affected cache tags or paths after successful mutations.

Target size: under about 30 lines per entry point.

## 2. Server Actions

- Defined in `src/features/<feature>/actions.ts` with `'use server'` at the top of the file. Exports are named `<verb><Noun>Action`.
- Accept a typed object or `FormData`; validate both with Zod. Never accept ownership IDs (`familyId`, `profileId`, `userId`) as arguments; derive them from the actor.
- Return `ActionResult<T>` ([architecture.md § 8](architecture.md#8-error-handling)). Expected failures are returned, not thrown.
- Return only what the UI needs. Never return Prisma records.
- Do not define Server Actions inline inside components when they capture sensitive values; closure variables are sent to the client encrypted, but encryption is not an access control.
- The default Server Action body limit (1 MB) stays. Audio uploads use a Route Handler.

## 3. Route Handlers

Route Handlers exist only for the cases in [architecture.md § 4](architecture.md#4-server-actions-and-route-handlers). Planned handlers:

| Method and path | Caller | Auth | Purpose |
| --- | --- | --- | --- |
| `POST /api/webhooks/paypal` | PayPal | Signature verification | Payment events ([payments.md § 6](payments.md#6-webhooks)) |
| `POST /api/assistant/voice` | Requester device | Device session + Origin check | Upload a short audio clip; returns transcript and proposal ([ai.md § 7](ai.md#7-voice-input)) |
| `GET /api/pairing/status` | Pairing device | Pairing cookie | Returns pairing status only; no state change |
| `POST /api/webhooks/clerk` *(only if approved)* | Clerk | `verifyWebhook` | Account deletion sync |

Conventions:

- Paths are lowercase kebab-case nouns under `/api/`. Use plural nouns for collections when collections are added.
- Use the correct method: `GET` reads (never mutates), `POST` creates or triggers, `PATCH` partially updates, `DELETE` removes.
- Export only the methods the route supports; others get 405 automatically.
- Parse JSON with `await request.json()` inside a try block, then Zod. For webhooks, read `await request.text()` first, because signature verification needs the exact body.
- Mutating handlers that use cookie authentication verify the `Origin` header ([security.md § 6](security.md#6-csrf-and-origin-protection)).
- Set `Cache-Control: no-store` on any response containing personal or payment data.

## 4. Response and error format

Route Handler success:

```json
{ "data": { } }
```

Route Handler error:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Please check the highlighted fields.", "fieldErrors": { "quantity": ["Must be between 1 and 20."] }, "requestId": "…" } }
```

| `AppError` code | HTTP status | User-facing message style |
| --- | --- | --- |
| `VALIDATION_FAILED` | 422 (400 for malformed JSON) | Which field and how to fix it |
| `UNAUTHENTICATED` | 401 | "Please sign in again." / device: reconnect screen |
| `FORBIDDEN` | 403 (only when the object is already known to the actor) | "You can't do that here." |
| `NOT_FOUND` | 404 (also for objects in other families) | "We couldn't find that." |
| `CONFLICT` | 409 | "This was already updated. Refresh to see the latest." |
| `RATE_LIMITED` | 429 + `Retry-After` | "Please wait a moment and try again." |
| `PAYMENT_PROVIDER_ERROR` | 502 | "PayPal didn't respond. You have not been charged." (only if that is verified true) |
| `AI_UNAVAILABLE` | 503 | "We couldn't understand that right now. Try pictures instead." |
| `INTERNAL` | 500 | "Something went wrong. Please try again." |

Also used: 200 OK, 201 Created (new resource), 204 No Content, 405 (unsupported method), 413 (upload too large), 415 (unsupported audio type).

- Messages are written for the actual audience. Requester devices never see payment or technical messages ([accessibility.md § 8](accessibility.md#8-errors-and-recovery)).
- `requestId` comes from the logger context, so the developer can find the server log entry.
- Never include stack traces, SQL, provider messages, or internal IDs that the actor may not see.

## 5. Typed contracts

- Each feature's `schemas.ts` defines input schemas; the inferred types are the contract.
- Output DTO types live in the feature's `types.ts`. When data crosses a trust boundary (provider responses, webhook payloads), parse it with a Zod output schema too.
- Zod 4 conventions: `z.uuid()`, `z.email()`, `z.int()`, `z.strictObject({...})`, the `error` parameter for custom messages. Check the installed `zod` types when unsure.

## 6. Idempotency for sensitive mutations

| Operation | Mechanism |
| --- | --- |
| Submit request | Client sends a `clientRequestKey` (UUID generated once per draft); unique per profile; a retry returns the existing request |
| Approve, decline, or cancel a request | Conditional status update (`where status = expected`); repeat calls return the current state |
| Start checkout | Basket lock (conditional update on `lockedAt`) allows one open `Payment`; repeat calls return the existing PayPal order ([payments.md § 5](payments.md#5-idempotency-and-concurrency)) |
| Capture payment | `PayPal-Request-Id` derived from the payment ID; already-captured payments return the stored result |
| Webhooks | Unique `paypalEventId`; duplicates acknowledged with 200 and ignored |
| Pairing completion | Conditional update from `APPROVED` to `COMPLETED` |

Buttons that trigger these show a pending state and ignore repeat presses, but the server never relies on that.

## 7. Pagination

- Only for lists that can grow (manager's request history, audit views). Cursor-based: `cursor` (last seen `id`) and `limit` (default 20, maximum 50). Return `nextCursor` or `null`.
- Requester screens show a short, fixed list (for example, the five most recent requests) instead of pagination.

## 8. Logging

- Log one structured line per entry point outcome: `event`, `requestId`, `actorType`, opaque IDs, duration, and error code. Follow [security.md § 9](security.md#9-safe-errors-and-logging) for what must never be logged.
- Log provider failures with the provider's correlation ID (for example PayPal `debug_id`).

## 9. Prohibited patterns

- Business rules, Prisma calls, or provider calls inside an action or handler body
- Accepting ownership IDs, prices, amounts, or roles from the client
- `GET` handlers that change state
- Returning raw errors or Prisma objects
- Internal HTTP calls from Server Components to our own Route Handlers
- Ad-hoc response shapes that differ from §4

## 10. Acceptance criteria

- [ ] The entry point follows the five steps in §1 and stays thin.
- [ ] Input and external output are validated with Zod; types are inferred from schemas.
- [ ] Error responses use the codes and statuses in §4.
- [ ] Sensitive mutations are idempotent per §6.
- [ ] Tests cover success, validation failure, unauthenticated, cross-family, and rate-limit cases ([testing.md § 4](testing.md#4-required-test-suites)).
