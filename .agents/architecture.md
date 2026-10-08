# Architecture

**Purpose:** Define how CareBasket is built on Next.js 16 App Router: rendering, server boundaries, layers, error handling, and integrations.
**Applies to:** Any code change.
**Related:** [folder-structure.md](folder-structure.md), [api.md](api.md), [security.md](security.md), [database.md](database.md), [catalog.md](catalog.md), [ai.md](ai.md), [performance.md](performance.md)
**Last reviewed:** 2026-10-08

---

## 1. Approved stack

| Concern | Choice (installed version) |
| --- | --- |
| Framework | Next.js 16.4 App Router, React 19.3, TypeScript (strict) |
| Styling | CSS Modules per component; global CSS for tokens and resets only |
| Icons | Hugeicons (`@hugeicons/react` + `@hugeicons/core-free-icons`) |
| Adult authentication | Clerk (`@clerk/nextjs` 7) |
| Database | Neon PostgreSQL via Prisma ORM 7 with `@prisma/adapter-pg` |
| Validation | Zod 4 |
| Payments | PayPal Sandbox: Orders API v2 and verified webhooks on the server; `@paypal/react-paypal-js` (v6 SDK entry `@paypal/react-paypal-js/sdk-v6`) on the client |
| AI | Gemini via `@google/genai`, behind a provider interface ([ai.md](ai.md)) |
| Product data | Open Prices API (primary) and Open Food Facts API (secondary metadata), called only by developer-run catalog scripts ([catalog.md](catalog.md)) |
| Fonts | DM Sans and Atkinson Hyperlegible Next via `next/font/google` ([design.md § 3.3](design.md#33-typography)) |
| Tests | Vitest 4, React Testing Library, jsdom |
| Package manager | npm |

Anything else needs developer approval ([workflow.md § 3](workflow.md#3-dependency-changes)).

## 2. Next.js 16 rules for this project

`next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `reactCompiler`. These change how code must be written. Read `node_modules/next/dist/docs/` before using any Next.js API; it is the source of truth over memory.

- **Proxy, not middleware.** Request interception lives in `src/proxy.ts` (the `middleware` file convention is deprecated). Proxy does coarse routing only, such as Clerk's protection of adult routes. It is **never** the authorization layer ([security.md § 2](security.md#2-authentication-and-authorization)).
- **Request-time data sits behind `<Suspense>`.** With Cache Components, reading `cookies()`, `headers()`, Clerk `auth()`/`currentUser()`, or the device session outside a Suspense boundary is a build error. Do not await the session at the top level of a layout. Push the read into a child component inside `<Suspense>` (see `01-app/02-guides/authentication-with-cache-components.md`).
- **`'use cache'` only for non-personal data.** The product catalog may use `'use cache'` with `cacheTag('catalog')` and a `cacheLife` profile. Family, profile, request, device, or payment data MUST NOT be stored in shared server caches. `'use cache: private'` is allowed for per-session reads when it measurably helps.
- **Cache keys and tags are plain text.** Never put tokens, names, emails, or other personal data in cached-function arguments or in `cacheTag` values. Use opaque IDs only.
- **Revalidate after mutations.** After a Server Action changes data that a page displays, use `updateTag`, `revalidateTag`, `revalidatePath`, or `refresh` as described in the installed docs.
- **React Compiler is on.** Write idiomatic React that follows the Rules of React. Do not add `useMemo`, `useCallback`, or `memo` by default; add them only with a measured reason and a comment.
- **Async Server Components** are not unit-testable with Vitest. Keep them thin and move logic into testable server functions ([testing.md § 3](testing.md#3-what-to-test-at-each-layer)).
- **`forbidden()` / `unauthorized()`** need the experimental `authInterrupts` flag, which is not enabled. Use `notFound()`, `redirect()`, or typed errors instead.

## 3. Server and Client Components

- Components are **Server Components by default**.
- Add `'use client'` only for browser interactivity: event handlers, state, effects, browser APIs (`MediaRecorder`, `navigator`), or client-only libraries (PayPal buttons, Clerk UI components).
- Place `'use client'` at the **smallest leaf** that needs it. A page is never a Client Component.
- Client Components receive **minimal, serializable DTOs**, never Prisma records, and never data the user may not see.
- Client Components MUST NOT import from `src/server/**`, any `server/` folder inside a feature, `src/lib/paypal/**`, `src/lib/ai/**`, or `src/lib/env/server.ts`. These modules start with `import 'server-only'`.

## 4. Server Actions and Route Handlers

| Use | Mechanism |
| --- | --- |
| Mutations triggered from CareBasket's own UI (forms, buttons, PayPal button callbacks) | **Server Actions** |
| Calls from outside the app (PayPal webhooks, optional Clerk webhooks) | **Route Handlers** |
| Binary uploads with explicit size control (voice audio) | **Route Handler** |
| Simple polling of status by an unauthenticated-but-cookie-bound flow (device pairing status) | **Route Handler** (`GET`) |
| Reading data for pages | Server Components calling server functions directly (no internal HTTP fetch to our own API) |
| Catalog discovery, refresh, and seeding | **Developer-run scripts** (`scripts/catalog/*`, `prisma/seed.ts`). Never a Route Handler, Server Action, scheduled job, or anything on the request path. |

Both entry points MUST stay thin: authenticate → validate → call a service → map the result ([api.md](api.md)).

## 5. Layers and dependency direction

```
app (routes, layouts, pages, route handlers)
  └─▶ features/<feature>  (components, actions, schemas, server/service, server/repository)
        └─▶ components (shared UI)   server (auth, db, audit, rate-limit, logging)   lib (integrations, pure utils)   types
```

| Layer | Responsibility | May import | Must not import |
| --- | --- | --- | --- |
| `src/app/` | Routing, layouts, composition, Suspense boundaries, route handlers | everything below | — |
| `features/*/components/` | Feature UI | `components`, `lib` (pure), `types`, own feature `schemas`/`types`/`actions` | `server`, any `features/*/server/`, integrations |
| `features/*/actions.ts` | `'use server'` entry points | own feature `server/`, `src/server/auth`, `schemas` | Prisma client directly |
| `features/*/server/service.ts` | Business rules, state transitions, orchestration | own repository, other features' **services**, `src/server/*`, `src/lib/*` | another feature's repository |
| `features/*/server/repository.ts` | Prisma queries for this feature, always family-scoped | `src/server/db` | services, integrations |
| `src/server/` | Cross-cutting server infrastructure | `src/lib`, `src/generated/prisma`, `types` | `features`, `app` |
| `src/lib/` | External integrations (PayPal, Gemini), env, pure utilities (money, formatting) | `types`, external packages | `server`, `features`, `app` |
| `src/components/` | Reusable, domain-agnostic UI | `lib` (pure), `types` | `features`, `server` |
| `scripts/` | Developer-run maintenance (catalog discovery and refresh) | `src/lib/*`, `src/server/db`, `features/catalog/server/*` | Nothing may import from `scripts/` |

Circular imports between features are prohibited. If two features need each other, move the shared rule into the feature that owns the data, or into `src/server/`.

## 6. Actors and authorization flow

Every server entry point resolves exactly one **actor** first ([authentication.md § 9](authentication.md#9-server-side-permission-verification)):

```ts
type Actor =
  | { type: 'adult'; userId: string; familyId: string; role: 'OWNER' | 'MANAGER' }
  | { type: 'device'; deviceId: string; profileId: string; familyId: string; profileKind: 'ASSISTED_ADULT' | 'CHILD' };
```

Services receive the actor (or an explicit `familyId` derived from it) and never read IDs of ownership from client input.

## 7. Typed contracts

- Every entry point validates input with a Zod schema from the feature's `schemas.ts`. Types are inferred: `type X = z.infer<typeof xSchema>`.
- Services accept and return explicit TypeScript types (DTOs), not Prisma model types, at the feature boundary.
- External responses (PayPal, Gemini, webhooks) are parsed with Zod before use.
- `any` is prohibited. Use `unknown` and narrow it.

## 8. Error handling

- Services throw `AppError` (in `src/server/errors.ts`) with a stable `code`:
  `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `CONFLICT`, `RATE_LIMITED`, `PAYMENT_PROVIDER_ERROR`, `AI_UNAVAILABLE`, `INTERNAL`.
- Server Actions return a discriminated result and never throw expected errors to the client:
  ```ts
  type ActionResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: { code: AppErrorCode; message: string; fieldErrors?: Record<string, string[]> } };
  ```
- Route Handlers map errors to the JSON envelope in [api.md § 4](api.md#4-response-and-error-format).
- Unexpected errors are logged server-side with a request ID and shown to users as a friendly, actionable message. Stack traces, Prisma errors, and provider messages never reach the client.
- Each route segment that loads data has an `error.tsx` boundary with a retry action, and a `loading.tsx` or Suspense fallback whose layout matches the loaded content.
- Objects outside the actor's family return **not found**, never "forbidden", to avoid revealing that they exist.

## 9. External integrations

- Each integration lives in `src/lib/<provider>/` behind a small typed interface, starts with `import 'server-only'`, and is the **only** place that talks to that provider: `src/lib/paypal/`, `src/lib/ai/`, `src/lib/open-prices/`, `src/lib/open-food-facts/`.
- Source-specific response types stay inside their adapter. Feature code works only with normalized CareBasket types ([catalog.md § 7](catalog.md#7-normalization)).
- **Catalog sources are never called during a user request.** Pages, actions, and the AI read the curated catalog from the database (cached with `'use cache'`).
- **AI boundary:** only the assistant service (`features/assistant/server/`) calls the AI provider. Its output can only become a client-side draft that the requester confirms; there is no code path from AI output to checkout, payment, catalog writes, or prices ([ai.md § 5](ai.md#5-request-workflow-and-states)).
- Credentials are read only via `src/lib/env/server.ts`, which validates `process.env` with Zod. Only `src/lib/env/*`, `next.config.ts`, and `prisma7.config.ts` may read `process.env`.
- Every outbound call has a timeout (`AbortSignal.timeout`), bounded retries for idempotent operations only, and a mapped `AppError` on failure.
- External calls MUST NOT run inside a database transaction.

## 10. Status updates without background infrastructure

- No job queues, cron workers, or websockets in the MVP.
- Requester and manager screens that wait for status (pairing, payment) refresh by polling a server read every 15–30 seconds while visible, and immediately on window focus. Polling stops when the page is hidden or the state is final.
- `after()` may be used for non-critical work after a response (for example, audit or usage logging), never for payment state changes.
- A background job may be introduced only with developer approval and a written reason.

## 11. Avoid premature abstraction

- No generic repositories, base classes, dependency-injection containers, or event buses.
- An interface exists only where a second implementation is real or planned: the AI provider (Gemini plus a test fake), the PayPal client (real plus a test fake), and the catalog source clients (real plus recorded-fixture fakes for importer tests).
- Prefer a plain function over a class. Three similar call sites justify extracting a helper; one does not.

## 12. Prohibited patterns

- Business logic or Prisma queries inside pages, layouts, components, or route handlers
- Fetching our own Route Handlers from Server Components
- Authorization only in `proxy.ts` or only in the UI
- `'use client'` on pages or layouts
- Reading `process.env` outside the env modules
- Passing Prisma objects or secrets to Client Components
- Session reads outside `<Suspense>` or inside `'use cache'`
- Global mutable singletons other than the Prisma client

## 13. Acceptance criteria

- [ ] Every new server entry point resolves an actor, validates input with Zod, and delegates to a service.
- [ ] Every Prisma call lives in a repository and is family-scoped where the data is family-owned.
- [ ] Client bundles contain no server-only modules.
- [ ] Request-time reads are wrapped in `<Suspense>`; personal data is never in shared caches.
- [ ] Errors reaching users are friendly and contain no internal details.
