# Performance

**Purpose:** Keep CareBasket fast on older phones and slow mobile connections, with responsive server operations that let every user continue without avoidable waiting.
**Applies to:** UI, Server Actions, Route Handlers, data loading, database queries, integrations, images, caching, and third-party scripts.
**Related:** [architecture.md § 2](architecture.md#2-nextjs-16-rules-for-this-project), [api.md](api.md), [design.md](design.md), [database.md § 6](database.md#6-access-boundaries-queries-and-performance)
**Last reviewed:** 2026-10-09

---

## 1. Targets

Measured by the developer with Lighthouse mobile (throttled 4G, mid-range device) on the deployed demo:

| Metric | Target |
| --- | --- |
| Largest Contentful Paint | ≤ 2.5 s on requester home and manager request review |
| Interaction to Next Paint | ≤ 200 ms |
| Cumulative Layout Shift | ≤ 0.1 |
| Internal authenticated reads | Warm p75 ≤ 300 ms and p95 ≤ 800 ms server duration |
| Database-only mutations | Warm p75 ≤ 500 ms and p95 ≤ 1 s server duration |
| Ordinary JSON response | ≤ 100 KB unless a documented use case requires more |
| AI interpretation feedback | A visible "Understanding your list…" state within 100 ms of submit; result typically under 5 s |
| Status refresh (pairing, payment) | Visible update within one polling interval (≤ 30 s), immediately on focus |

The endpoint targets exclude browser latency and external providers such as Clerk, Gemini, and PayPal. Track provider time separately. Cold starts are measured separately from warm requests and must not be hidden by averaging.

## 2. Measure before and after

- Treat the targets in §1 as performance budgets, not guesses that an implementation is fast.
- Measure server duration, database duration and query count, external-provider duration, response bytes, client bundle size, and Core Web Vitals where each applies.
- Compare p50, p75, and p95 over repeated realistic requests. A single local request is not evidence of production performance.
- Test both warm and cold paths, a mid-range mobile device, throttled 4G, realistic list sizes, and the deployed region before submission.
- Add structured duration fields to existing safe logs; never log personal data, request text, secrets, tokens, or provider payloads to diagnose performance.
- Optimize the largest measured bottleneck first and record the before/after result. Do not add infrastructure, dependencies, caching, or complexity for an unmeasured micro-optimization.

## 3. Fast server operations and endpoints

- Authenticate, authorize, rate-limit, and validate every request as required. Performance never weakens a security boundary or skips validation.
- Keep Route Handlers and Server Actions thin. They call one service and return the smallest DTO the UI needs ([api.md § 1](api.md#1-shape-of-every-entry-point)).
- Never call CareBasket's own HTTP endpoints from Server Components, Server Actions, Route Handlers, or services. Call the service directly and avoid the extra network hop and serialization.
- After the actor is resolved, start independent authorized reads together and await them with `Promise.all`. Keep dependent work sequential and obvious.
- Keep non-critical work off the response path with Next.js `after()` only when failure cannot affect the response or business outcome. Payment state, authorization, audit records required by the operation, and other transactional work remain on the critical path.
- Bound external calls with timeouts and limited retries only where retrying is safe and idempotent. Never hold a database transaction open while waiting for a provider.
- Return minimal response fields and bounded collections. Paginate growing lists; never return an unbounded history or catalog.
- Avoid duplicate work within one request. Reuse the resolved actor and already-loaded DTOs instead of repeating authentication or database reads.
- Keep serverless functions and Neon in the same region, use the existing pooled runtime connection, and do not create a database client per request.

## 4. Server-first rendering

- Pages and layouts are Server Components; data is fetched on the server close to the database.
- With Cache Components, static parts of a page render into the static shell; request-time parts stream inside `<Suspense>` with layout-matching fallbacks ([architecture.md § 2](architecture.md#2-nextjs-16-rules-for-this-project)).
- Fetch independent data in parallel (`Promise.all`), not in sequence.
- Never fetch our own API from Server Components.

## 5. Client JavaScript budget

- `'use client'` only at interactive leaves ([architecture.md § 3](architecture.md#3-server-and-client-components)).
- **Requester routes** (`/shop`, `/connect`) MUST NOT render Clerk UI components or load the PayPal SDK or any AI SDK. They SHOULD also avoid Clerk's client runtime by scoping `ClerkProvider` to the adult and auth route groups, if Clerk's current docs support that ([authentication.md § 3](authentication.md#3-clerk-sign-in-and-sessions)).
- **PayPal SDK** loads only on the manager's request review page, and only when the manager reaches the payment step.
- Import Hugeicons one icon at a time; never import a whole icon set.
- Heavy, rarely used UI (for example, the voice recorder) is lazy-loaded with `next/dynamic` or `React.lazy` when it is not needed for first paint.
- New client dependencies need approval and a size justification ([workflow.md § 3](workflow.md#3-dependency-changes)).
- The developer reviews per-route JavaScript sizes in `next build` output at each milestone.

## 6. Images

- Use `next/image` for all raster images, with explicit `width`/`height` or `fill` plus `sizes`, so layout is stable and the right size is served.
- Product images in `public/products/` are the 400-pixel Open Food Facts display images, stored unmodified so their provenance stays exact ([catalog.md § 9](catalog.md#9-images)); `next/image` serves resized WebP or AVIF variants. Never hotlink third-party images.
- Only the first visible row of product images may use `priority`/eager loading; everything else lazy-loads.
- Icons are SVG components (Hugeicons), not images.

## 7. Data and database

- Query only the fields the screen needs; avoid N+1 queries; paginate growing lists ([database.md § 6](database.md#6-access-boundaries-queries-and-performance)).
- Prefer one well-shaped query or a small number of parallel queries over many sequential round trips. Batch lookups with relations or `in` filters when ownership rules permit it.
- Every new list, lookup, sort, and conditional update must have an index that matches its real filter and ordering pattern. Preserve family scoping in the index where family-owned data is queried by family.
- Keep query counts bounded as data grows. A page or endpoint must not issue one query per returned row.
- When a measured query misses its budget, the developer inspects its generated SQL and PostgreSQL execution plan before changing indexes or introducing raw SQL.
- Use atomic conditional writes and database constraints instead of read-then-write races. They reduce round trips and preserve correctness under load.
- Host server functions in the same region as the Neon database.
- Neon may suspend idle compute; the first request after idle is slower. Do not add retries for this; warm the demo before presenting.
- Keep transactions short and never wait on external services inside them.

## 8. Caching

- The product catalog is cached with `'use cache'`, `cacheTag('catalog')`, and a long `cacheLife` (for example `'hours'`), and invalidated when the seed changes.
- Personal data is never cached in shared server caches ([architecture.md § 2](architecture.md#2-nextjs-16-rules-for-this-project)). Responses with personal or payment data send `Cache-Control: no-store`.
- Use `'use cache: private'` for session-derived data only when measurement shows a meaningful benefit and the invalidation and privacy behavior are documented. Never cache an authorization decision beyond the session guarantees it depends on.
- Every cache requires an owner, lifetime, invalidation path, and privacy classification. If any is unclear, do not cache it.
- Do not use caching to hide an inefficient query or an unbounded response.
- Static assets rely on Next.js defaults (immutable hashed files).

## 9. Network requests

- Status polling runs only while the relevant page is visible, every 15–30 seconds, stops on final states, and refreshes immediately on window focus ([architecture.md § 10](architecture.md#10-status-updates-without-background-infrastructure)).
- No polling on pages that do not show changing status.
- Debounce nothing that the user explicitly submits; instead, disable repeat submission while pending.
- Audio uploads are capped at 2 MB ([ai.md § 7](ai.md#7-voice-input)).
- Cancel obsolete client requests with `AbortController` when a newer request makes their result irrelevant.
- Do not add prefetching blindly. Prefetch only likely next navigation and never personal data into a shared cache.

## 10. Perceived performance and stable layout

- Every loading state uses a skeleton or reserved space with the final layout ([design.md § 7](design.md#7-screen-states)).
- Buttons show immediate pending feedback on press.
- Use optimistic UI only for low-risk, reversible actions (for example, changing a quantity in a draft basket). Never for payment or status changes.
- Fonts load through `next/font` with `display: 'swap'` and the Latin subset only: DM Sans (preloaded, variable) for the interface, and Atkinson Hyperlegible (`preload: false`) used only for requester reading text, so other screens never download it ([design.md § 3.3](design.md#33-typography)). No other font families.

## 11. Animation

- Only `opacity` and `transform` transitions, at `--duration-fast` or `--duration-base`.
- No decorative, looping, or scroll-driven animation. Respect `prefers-reduced-motion`.

## 12. Performance decision rules

- Prefer platform and framework capabilities already installed: Server Components, Suspense streaming, Cache Components, `next/image`, route code splitting, HTTP compression, Prisma projection, and PostgreSQL indexes.
- Introduce a high-level technique only when it addresses a measured bottleneck and keeps the code easier to operate than the problem it solves.
- Do not introduce queues, Redis, a CDN integration, a new cache service, virtualization, workers, speculative prefetching, or performance-monitoring dependencies without developer approval and evidence that the simpler stack misses its budget.
- Performance improvements must preserve correctness, security, privacy, accessibility, idempotency, and error recovery. A faster incorrect or unsafe response is a regression.

## 13. Prohibited patterns

- Client-side data fetching for data the server can render
- Loading the PayPal SDK, AI SDKs, or Clerk UI components on requester routes
- Unoptimized `<img>` tags for raster images, or images without dimensions
- Polling on hidden tabs or in loops after a final state
- Heavy animation libraries or large UI kits
- Sequential awaits for independent data
- Unbounded queries, responses, retries, uploads, or client-side collections
- N+1 database queries or repeated authentication/database reads within one request
- Caching personal data in a shared cache or caching without an invalidation plan
- Adding optimization complexity without before-and-after measurements
- Doing provider calls or nonessential work inside a database transaction

## 14. Acceptance criteria

- [ ] New pages render on the server with Suspense fallbacks that match the final layout.
- [ ] New or changed endpoints meet the applicable §1 budget with warm and cold measurements supplied by the developer.
- [ ] Independent authorized work runs in parallel; dependent work remains explicit.
- [ ] DTOs, query projections, list sizes, response sizes, and query counts are bounded.
- [ ] Database access has no N+1 pattern and uses indexes matching its filters and ordering.
- [ ] External calls have safe timeouts and do not run inside database transactions.
- [ ] Every cache has a lifetime, invalidation path, owner, and privacy classification.
- [ ] Requester bundles contain no PayPal SDK, AI SDK, or Clerk UI component code.
- [ ] Images use `next/image` with dimensions and `sizes`.
- [ ] Polling follows §9.
- [ ] The developer's Lighthouse mobile run meets §1 before submission.
