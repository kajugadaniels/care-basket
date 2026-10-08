# Performance

**Purpose:** Keep CareBasket fast on older phones and slow mobile connections, where most requesters will use it.
**Applies to:** UI, data loading, images, caching, and third-party scripts.
**Related:** [architecture.md § 2](architecture.md#2-nextjs-16-rules-for-this-project), [design.md](design.md), [database.md § 6](database.md#6-access-boundaries-queries-and-performance)
**Last reviewed:** 2026-10-08

---

## 1. Targets

Measured by the developer with Lighthouse mobile (throttled 4G, mid-range device) on the deployed demo:

| Metric | Target |
| --- | --- |
| Largest Contentful Paint | ≤ 2.5 s on requester home and manager request review |
| Interaction to Next Paint | ≤ 200 ms |
| Cumulative Layout Shift | ≤ 0.1 |
| AI interpretation feedback | A visible "Understanding your list…" state within 100 ms of submit; result typically under 5 s |
| Status refresh (pairing, payment) | Visible update within one polling interval (≤ 30 s), immediately on focus |

## 2. Server-first rendering

- Pages and layouts are Server Components; data is fetched on the server close to the database.
- With Cache Components, static parts of a page render into the static shell; request-time parts stream inside `<Suspense>` with layout-matching fallbacks ([architecture.md § 2](architecture.md#2-nextjs-16-rules-for-this-project)).
- Fetch independent data in parallel (`Promise.all`), not in sequence.
- Never fetch our own API from Server Components.

## 3. Client JavaScript budget

- `'use client'` only at interactive leaves ([architecture.md § 3](architecture.md#3-server-and-client-components)).
- **Requester routes** (`/shop`, `/connect`) MUST NOT render Clerk UI components or load the PayPal SDK or any AI SDK. They SHOULD also avoid Clerk's client runtime by scoping `ClerkProvider` to the adult and auth route groups, if Clerk's current docs support that ([authentication.md § 3](authentication.md#3-clerk-sign-in-and-sessions)).
- **PayPal SDK** loads only on the manager's request review page, and only when the manager reaches the payment step.
- Import Hugeicons one icon at a time; never import a whole icon set.
- Heavy, rarely used UI (for example, the voice recorder) is lazy-loaded with `next/dynamic` or `React.lazy` when it is not needed for first paint.
- New client dependencies need approval and a size justification ([workflow.md § 3](workflow.md#3-dependency-changes)).
- The developer reviews per-route JavaScript sizes in `next build` output at each milestone.

## 4. Images

- Use `next/image` for all raster images, with explicit `width`/`height` or `fill` plus `sizes`, so layout is stable and the right size is served.
- Product images in `public/products/` are square, at most 600 × 600 px source, optimized WebP or AVIF, ideally under 60 KB each.
- Only the first visible row of product images may use `priority`/eager loading; everything else lazy-loads.
- Icons are SVG components (Hugeicons), not images.

## 5. Data and database

- Query only the fields the screen needs; avoid N+1 queries; paginate growing lists ([database.md § 6](database.md#6-access-boundaries-queries-and-performance)).
- Host server functions in the same region as the Neon database.
- Neon may suspend idle compute; the first request after idle is slower. Do not add retries for this; warm the demo before presenting.
- Keep transactions short and never wait on external services inside them.

## 6. Caching

- The product catalog is cached with `'use cache'`, `cacheTag('catalog')`, and a long `cacheLife` (for example `'hours'`), and invalidated when the seed changes.
- Personal data is never cached in shared server caches ([architecture.md § 2](architecture.md#2-nextjs-16-rules-for-this-project)). Responses with personal or payment data send `Cache-Control: no-store`.
- Static assets rely on Next.js defaults (immutable hashed files).

## 7. Network requests

- Status polling runs only while the relevant page is visible, every 15–30 seconds, stops on final states, and refreshes immediately on window focus ([architecture.md § 10](architecture.md#10-status-updates-without-background-infrastructure)).
- No polling on pages that do not show changing status.
- Debounce nothing that the user explicitly submits; instead, disable repeat submission while pending.
- Audio uploads are capped at 2 MB ([ai.md § 7](ai.md#7-voice-input)).

## 8. Perceived performance and stable layout

- Every loading state uses a skeleton or reserved space with the final layout ([design.md § 7](design.md#7-screen-states)).
- Buttons show immediate pending feedback on press.
- Use optimistic UI only for low-risk, reversible actions (for example, changing a quantity in a draft basket). Never for payment or status changes.
- Fonts load through `next/font` with `display: 'swap'`, a single family, and only the weights used.

## 9. Animation

- Only `opacity` and `transform` transitions, at `--duration-fast` or `--duration-base`.
- No decorative, looping, or scroll-driven animation. Respect `prefers-reduced-motion`.

## 10. Prohibited patterns

- Client-side data fetching for data the server can render
- Loading the PayPal SDK, AI SDKs, or Clerk UI components on requester routes
- Unoptimized `<img>` tags for raster images, or images without dimensions
- Polling on hidden tabs or in loops after a final state
- Heavy animation libraries or large UI kits
- Sequential awaits for independent data

## 11. Acceptance criteria

- [ ] New pages render on the server with Suspense fallbacks that match the final layout.
- [ ] Requester bundles contain no PayPal SDK, AI SDK, or Clerk UI component code.
- [ ] Images use `next/image` with dimensions and `sizes`.
- [ ] Polling follows §7.
- [ ] The developer's Lighthouse mobile run meets §1 before submission.
