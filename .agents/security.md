# Security

**Purpose:** Define the security boundaries for CareBasket's sensitive operations: identities, family data, payments, AI, and secrets.
**Applies to:** Any server code, any data access, any configuration. This document wins on any security question.
**Related:** [authentication.md](authentication.md), [api.md](api.md), [payments.md](payments.md), [ai.md § 9](ai.md#9-prompt-injection-and-output-safety), [privacy.md](privacy.md)
**Last reviewed:** 2026-10-08

---

## 1. What we protect

| Asset | Main threats |
| --- | --- |
| Family and profile data (names, requests, children's data) | Cross-family access (IDOR), over-exposure to clients, leaking through logs or caches |
| Device sessions and pairing codes | Brute force, theft, replay, social engineering |
| Payment integrity | Tampered prices or amounts, forged success, dependent-triggered payment, duplicate capture |
| Provider credentials (PayPal, Gemini, Clerk, Neon) | Exposure in client bundles, logs, repository, or AI prompts |
| AI behaviour | Prompt injection, invented products or prices, data leakage |

## 2. Authentication and authorization

- Every Server Action, Route Handler, and server data read authenticates the actor **itself** using `src/server/auth/` ([authentication.md § 9](authentication.md#9-server-side-permission-verification)). `proxy.ts` and UI visibility are never sufficient.
- Authorization is checked **close to the data**: services receive the actor, and repositories require a `familyId`.
- **Deny by default.** A capability not granted in the permission matrix is forbidden.
- Re-check authorization on every mutation, even when the page that rendered the form already checked it.

## 3. Family isolation and object ownership

- Every query on family-owned data includes `familyId` from the server-resolved actor in its `where` clause. Use `findFirst({ where: { id, familyId } })`, never `findUnique({ where: { id } })` followed by a separate check you might forget.
- Device actors are further restricted to their own `profileId`.
- IDs from the client (route params, form fields, JSON bodies) are **lookup keys only**, never proof of access.
- UUIDs are non-guessable but are **not secrets**.
- Objects outside the actor's scope return `NOT_FOUND` (404), never a distinguishing 403.
- Never trust client-supplied `userId`, `familyId`, `profileId`, `role`, price, quantity limits, currency, or amount. Derive or recompute them on the server.

## 4. Least privilege

- Device sessions can only do what the matrix in [authentication.md § 9](authentication.md#9-server-side-permission-verification) allows.
- DTOs sent to clients contain only the fields the screen needs. Requester DTOs exclude prices, other profiles, and family settings.
- Server modules that hold credentials (`src/lib/paypal`, `src/lib/ai`, `src/lib/env/server.ts`, `src/server/**`) start with `import 'server-only'`.
- The database role used by the app should not be a superuser. Neon's default role is acceptable for the hackathon; record it as a hardening item.

## 5. Sessions and cookies

- Device session and pairing cookies follow [authentication.md § 8](authentication.md#8-device-sessions): `HttpOnly`, `Secure` in production, `SameSite=Lax`, `Path=/`, `__Host-` prefix in production, opaque random tokens, stored hashed.
- No session or token in `localStorage`, `sessionStorage`, URLs, or client-readable cookies.
- Clerk cookies are managed by Clerk; do not read or modify them directly.

## 6. CSRF and origin protection

- Server Actions rely on Next.js's built-in POST-only invocation and `Origin`/`Host` comparison. Do not add `serverActions.allowedOrigins` entries except for a documented tunnel or proxy host.
- Route Handlers that **mutate** and authenticate with cookies MUST verify that the `Origin` header matches `NEXT_PUBLIC_APP_URL` and reject otherwise.
- `GET` handlers MUST NOT change state.
- Webhook handlers are exempt from origin checks because they use no cookies; they rely on signature verification instead ([payments.md § 6](payments.md#6-webhooks)).

## 7. Input validation

- Validate every external input with Zod 4 at the entry point: action arguments, `FormData`, JSON bodies, route params, `searchParams`, headers that drive logic, webhook payloads, PayPal and Gemini responses, and environment variables.
- Use strict object schemas (`z.strictObject`), explicit length limits on every string, integer and range limits on numbers, `z.uuid()` for IDs, and enums for statuses.
- Trim and normalize text; reject control characters in names and labels.
- Uploaded audio: check declared MIME type against an allow-list, enforce a byte limit **before** buffering the full body, and never trust the file name ([ai.md § 7](ai.md#7-voice-input)).
- Render user and AI text as text. Never use `dangerouslySetInnerHTML` with user or AI content.

## 8. Rate limiting and brute-force protection

Rate limiting is enforced in the application with a Postgres-backed fixed-window counter in `src/server/rate-limit/` (atomic upsert on `RateLimitCounter`, see [database.md § 5](database.md#5-planned-models)). In-memory limiters MUST NOT be relied on, because serverless instances do not share memory.

| Action | Key | Limit |
| --- | --- | --- |
| Start pairing (`/connect`) | HMAC of client IP | 5 per hour |
| Pairing status poll | pairing ID | 30 per minute |
| Failed pairing-code entries | adult user ID | 5 per 15 minutes, 20 per day; then a cooldown message |
| AI interpretation (text or voice) | device ID | 30 per hour; also 200 per day per family |
| Submit shopping request | device ID | 20 per hour |
| Start checkout | request ID | 10 per hour |

- Responses over the limit return `RATE_LIMITED` (HTTP 429 with `Retry-After` for Route Handlers) and a calm message.
- Client IPs are taken only from the hosting platform's trusted header ([deployment.md § 6](deployment.md#6-platform-notes)) and stored only as `HMAC-SHA256(ip, DEVICE_AUTH_SECRET)` with short retention.
- Pairing codes are 6 digits, but brute force is impractical because entry requires an authenticated adult, attempts are limited per adult, codes expire in 10 minutes, and completion also needs the device's secret cookie.

## 9. Safe errors and logging

- Clients receive stable error codes and friendly messages only ([api.md § 4](api.md#4-response-and-error-format)). No stack traces, SQL, Prisma, PayPal, or Gemini error text.
- Server logs use `src/server/logger.ts`: structured JSON with `requestId`, `event`, `actorType`, and opaque IDs.
- **Never log:** secrets, tokens, cookies, `Authorization` headers, pairing codes, full webhook payloads, payer details, audio, prompts, transcripts, request text, names, or emails. The logger redacts known sensitive keys as a safety net, not as the primary control.
- PayPal `debug_id` values and provider request IDs may be logged; they help support without exposing data.

## 10. Secret management

- Secrets live only in environment variables on the server, validated by `src/lib/env/server.ts`. The full list is in [deployment.md § 3](deployment.md#3-environment-variables).
- Only these values may be public (`NEXT_PUBLIC_*`): the Clerk publishable key, the PayPal client ID, and the app URL. Anything else with that prefix is a security bug.
- `.env*` files are git-ignored. `.env.example` lists names with placeholders only.
- Secrets are never placed in source code, tests, fixtures, documentation, screenshots, demo videos, AI prompts, or issue text.
- Agents never read secret values ([workflow.md § 1.3](workflow.md#13-secrets)).
- If a secret is exposed, the developer rotates it at the provider immediately, then updates the environment.

## 11. Payment tamper resistance

Owned by [payments.md](payments.md). Non-negotiable summary:

- Amounts are computed on the server from catalog prices in the database × validated quantities, in integer minor units.
- The client sends only a request ID to start checkout, and only the PayPal order ID it was given to capture.
- Capture results are verified (status, amount, currency, our reference) before anything is marked paid.
- Device actors can never create, approve, or capture a payment.

## 12. Webhook security

Owned by [payments.md § 6](payments.md#6-webhooks). Every webhook is signature-verified with the provider before any processing, is idempotent by event ID, and never trusts payload data without re-fetching state from the provider's API.

## 13. Audit logging

Write append-only `AuditLog` entries (via `src/server/audit/`) for:

- family created, renamed, or deleted; account deleted
- profile created, updated, or deleted (consent recorded)
- pairing requested, approved, rejected, completed, or failed lookups over the threshold
- device revoked or expired by policy
- request submitted, cancelled, edited during review, declined, or approved
- checkout started, payment captured, failed, or pending; webhook verification failures

Each entry records `actorType`, actor ID, `familyId`, `action` (dot-case, for example `pairing.approved`), target type and ID, minimal non-sensitive metadata, and a timestamp. No personal text, secrets, or payment details. Retention is in [privacy.md § 7](privacy.md#7-deletion-and-retention).

## 14. HTTP security headers

Configure in `next.config.ts` `headers()` (an implementation task, not done yet):

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: microphone=(self), camera=(), geolocation=()`
- `Content-Security-Policy: frame-ancestors 'none'` (or `X-Frame-Options: DENY`)
- A full Content Security Policy is a SHOULD after core flows work. It must allow the PayPal SDK and Clerk origins (Clerk ships CSP helpers in `@clerk/nextjs/server`). Re-test sign-in and checkout after any CSP change.

## 15. Dependencies and supply chain

- New dependencies need developer approval ([workflow.md § 3](workflow.md#3-dependency-changes)). Prefer official vendor SDKs and the existing stack over new packages.
- Check license compatibility with the project's open-source license, maintenance activity, and install scripts before proposing a package.
- `package-lock.json` is committed and changed only by the developer's npm commands.
- The developer reviews `npm audit` output before submission; agents do not run it.
- Never load third-party scripts except the PayPal SDK (through `@paypal/react-paypal-js`) and Clerk. No analytics or tracking scripts.

## 16. Retention and deletion

Owned by [privacy.md § 7](privacy.md#7-deletion-and-retention). Security-relevant rules: hashed tokens are deleted with their device; expired pairings are purged after 24 hours; rate-limit rows are purged after their window ends.

## 17. Prohibited patterns

- Authorization only in `proxy.ts` or only in the UI
- Queries on family data without a server-derived `familyId`
- Trusting prices, amounts, or IDs of ownership from the client
- JWT or client-readable device sessions; tokens in URLs
- Logging secrets, codes, prompts, transcripts, or personal data
- `NEXT_PUBLIC_` secrets
- `dangerouslySetInnerHTML` with user or AI content
- Processing a webhook before verifying its signature
- Disabling a security control "temporarily" without a written, developer-approved reason

## 18. Acceptance criteria

- [ ] Each new entry point has authentication, authorization, Zod validation, and rate limiting where listed in §8.
- [ ] Tests prove cross-family access returns not found, and that device actors cannot reach adult capabilities ([testing.md § 4](testing.md#4-required-test-suites)).
- [ ] No secret or personal data appears in logs, client bundles, cache keys, or AI prompts beyond what [ai.md](ai.md) allows.
- [ ] Audit entries are written for every event in §13.
