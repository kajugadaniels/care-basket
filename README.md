# CareBasket

CareBasket helps adults aged 18 or older who find online shopping difficult ask a trusted family member for groceries. Requesters type or choose product pictures on a connected device; an authenticated adult reviews quantities and decides whether to pay using PayPal Sandbox.

This is an independent PayPal AI Hackathon 2026 prototype, not a live grocery service or a PayPal-endorsed product. **CareBasket Demo Market**, its approved prices and fulfillment are simulated. No real grocery orders, deliveries or money transfers take place. Use fictional people and Sandbox test accounts only.

## Project status

Source implements family setup, consent-based profiles, secure pairing, catalog browsing, shopping lists, private reviews, manager review, Sandbox order creation, capture verification and signed webhook reconciliation. Source presence is not evidence of a successful deployment, payment or accessibility test.

Buyer approval is **off by default** pending controlled verification. The supported deployment audience is **adults 18+ only**. New setup/profile consent confirms age eligibility and permission; child profile creation, pairing, existing device access, and shopping/review access are blocked. Historical child records remain available for manager review and confirmed deletion, not automatically relabelled or deleted. These controls are not age verification.

Gemini and voice processing remain **blocked** pending a separate application-wide eligibility, account/billing, region, and model review. Changing the audience does not activate Gemini. Deterministic text matching and pictures remain available; they are not real Gemini calls. No end-to-end provider operation is claimed here.

Demo URL: not yet supplied/verified. Video URL: not yet supplied/verified. See [release readiness](docs/release-readiness.md) and [submission readiness](docs/submission-readiness.md).

## Core journey

1. An adult signs in with Clerk, confirms adult-only use, creates a family and adds an adult managed profile with consent.
2. A separate requester browser starts pairing; the adult reviews and approves that device.
3. The requester opens `/shop/assistant` or `/shop/products`, builds a list and explicitly sends it.
4. The adult reviews `/family/requests`, adjusts quantities and decides whether to pay.
5. In an approved controlled Sandbox test, buyer approval is followed by server capture and verification. The requester sees confirmation without payment details.

Payment never implies delivery. Refund/reversal status and simulated fulfillment remain separate. Devices cannot administer families or pay.

## Stack

| Area | Implementation |
| --- | --- |
| Web | Next.js 16 App Router, React 19, TypeScript strict mode, Cache Components/streaming |
| Identity | Clerk for adults; database-backed opaque sessions for managed devices |
| Database | Prisma 7, PostgreSQL driver adapter, Neon pooled runtime/direct migrations |
| Assistance | Gemini adapter with global eligibility and profile-consent gates; deterministic fallback |
| Payments | PayPal Orders v2, Sandbox-only REST, JavaScript SDK v6 through React SDK, signed webhooks |
| Catalog | Reviewed Open Prices/Open Food Facts data and approved curated essentials |
| Images | Reviewed photos, Cloudinary mappings, same-origin Next image optimization |
| UI | CSS Modules, Hugeicons, DM Sans and Atkinson Hyperlegible |
| Tests | Vitest 4, Testing Library, jsdom; mocked providers and database boundaries |
| API tooling | OpenAPI 3.0 contract prepared for APIMatic; secret-free Postman security checks |

## Architecture

- `src/app/` composes routes/API handlers. `/family/*` uses Clerk-derived OWNER/MANAGER authorization; `/shop/*` uses a freshly validated device actor. `/shop` redirects to the assistant. The former manager catalog route is removed.
- `src/features/` owns components, authenticated Server Actions, Zod schemas, business services and scoped repositories. `src/server/` owns auth, database, rate limits and safe logs.
- Shared caching is restricted to nonpersonal catalog data with bounded cursor loading. Adult requester devices receive no prices; historical child profiles cannot browse. Shopping never calls Open Prices/Open Food Facts.
- Send snapshots server-owned approved USD prices and stable submission identity. Optimistic manager edits require backend validation and rollback on failure. Checkout serializes mutations and locks the basket.
- Stable order/capture keys, operation fences and verified identities/amounts prevent duplicate or false success. Only a verified completed capture marks PAID. Unknown outcomes remain unconfirmed; minimal verified PaymentEvents reconcile signed duplicates, out-of-order events and reversals without storing bodies.
- AI only proposes. Device-bound encrypted reviews expire within 30 minutes or earlier proof expiry. URLs contain opaque lookup IDs, not words/audio/proofs. Audio is never persisted. Private requests/payments are not shared-cached.
- The [CareBasket Shopping Guide contract](docs/agentic-commerce-step-1.md) defines a single supervised assistant with catalog read/proposal authority only. Request submission, manager decisions, family access and PayPal checkout remain outside assistant control.
- Its [catalog capabilities](docs/agentic-commerce-step-2.md) provide bounded, price-free search, product lookup and package-size comparison behind the existing authenticated catalog service; they are internal capabilities, not public APIs or autonomous model tools.
- The [controlled orchestration layer](docs/agentic-commerce-step-3.md) deterministically routes strict search, lookup and comparison operations to those capabilities and returns proposals or one clarification without changing a draft.
- The [requester guidance flow](docs/agentic-commerce-step-4.md) offers controlled catalog help for unresolved words and requires an explicit add action for every proposed product.
- [Explainable suggestions](docs/agentic-commerce-step-5.md) show a short catalog-grounded reason based only on the current request and still require explicit confirmation.

## Local setup (developer-run)

Use npm with a supported Node version: 22.13+ within 22.x or 20.19+ within 20.x satisfies installed Prisma/jsdom requirements. Next's lower Node minimum alone is insufficient. Prepare a dedicated Neon development branch and Clerk development instance; privately configure Sandbox when testing payments. Gemini credentials are not needed for fallback.

```bash
npm ci
cp .env.local.example .env.local
```

Fill the private file from provider dashboards. Never commit or paste secrets. [Local](.env.local.example) and [production](.env.production.example) templates list the same variables. Configure pooled DATABASE_URL/direct DIRECT_URL for the same development branch, Clerk keys, canonical app origin and a unique random device secret.

Local DEVICE_IP_SOURCE=unconfigured uses a shared database-limited bucket. Production fails closed without reviewed ingress. Set CLOUDINARY_CLOUD_NAME to the account in committed mappings; upload secrets are not required by the app/seed. Leave PAYPAL_ENVIRONMENT=sandbox, PAYPAL_BUYER_APPROVAL_ENABLED=false and GEMINI_SHOPPING_ENABLED=false. Do not bypass eligibility constants.

```bash
npx prisma generate --config prisma7.config.ts
npx prisma migrate dev --config prisma7.config.ts
npx prisma db seed --config prisma7.config.ts
npm run dev
```

Use migrate dev **only** on your development branch. Open http://localhost:3000. [prisma7.config.ts](prisma7.config.ts) selects `.env.local` by default and DIRECT_URL for migrations; shell variables win. Check the target before writes. Seed validates the reviewed catalog offline, upserts and deletes no products. Restart/redeploy after seed to invalidate catalog cache.

## Validation and deployment preparation

```bash
npm run lint
npx tsc --noEmit
npx vitest run
npm run build
```

Generate Prisma first on a clean checkout. Build already runs generation before next build; generated client files are ignored. It neither migrates nor seeds nor verifies provider credentials/browser behavior. Tests use fakes, never live PayPal/Gemini/Clerk/Neon. No new hooks or CI were added.

For a demo database use `NODE_ENV=production npx prisma migrate deploy --config prisma7.config.ts`, never migrate dev/reset/db push. Follow [deployment preparation](docs/deployment/demo-deployment.md) for HTTPS, Clerk, an isolated Neon branch, trusted IP, Sandbox signing, images and function limits. Keep local secret files out of production build contexts.

## API contract, APIMatic and Postman

The [OpenAPI contract](openapi/carebasket.openapi.yaml) documents only CareBasket's HTTP Route Handlers: read-only pairing polling, consent-gated voice interpretation and signed PayPal webhook ingestion. Authenticated application mutations remain Server Actions and are deliberately excluded. The contract preserves browser-cookie, origin, rate-limit, upload and PayPal-signature requirements; it does not create an alternative authentication path.

The contract is ready to import into APIMatic for contract validation and generated reference documentation. APIMatic also offers a PayPal Context Plugin that can support documentation-aware review of PayPal integrations:

```bash
npx context-plugins install paypal
```

Installing or importing a tool is not evidence that PayPal Sandbox behavior works. Before describing APIMatic as a completed sponsor integration, record the APIMatic validation result and use its PayPal context in a real review of the Sandbox order, capture and webhook implementation. CareBasket continues to use its small reviewed REST adapter; this tooling does not replace it or add a production payment dependency.

Import [the Postman collection](postman/CareBasket.postman_collection.json) and [local environment](postman/CareBasket.local.postman_environment.json) into Postman, start CareBasket locally, select the environment and run the collection. Its automated checks intentionally confirm that missing pairing/device sessions and unsigned PayPal webhooks fail closed. The committed files contain fictional data and no secrets. Successful browser flows must be tested through the UI, while authentic webhook success must come from PayPal Sandbox. Never paste cookies, credentials, transcripts or real customer data into a committed collection, environment or example.

## Documentation and limitations

- [Release audit](docs/release-readiness.md): journey inventory, source/security findings and blockers.
- [Two-browser testing](docs/testing/end-to-end.md): success, recovery, accessibility and responsive checks.
- [Deployment](docs/deployment/demo-deployment.md) and [submission checklist](docs/submission-readiness.md).
- [Catalog guide](prisma/catalog/README.md), [photo attribution](public/products/ATTRIBUTION.md), public `/data-sources` and `/privacy` pages.
- [Agent contract](docs/agentic-commerce-step-1.md): purpose, authority, confirmation and data boundaries for supervised shopping assistance.
- [Agent catalog capabilities](docs/agentic-commerce-step-2.md): bounded internal search, lookup and comparison contracts.
- [Agent orchestration](docs/agentic-commerce-step-3.md): deterministic capability selection, unresolved-phrase handling and proposal-only results.
- [Agent requester guidance](docs/agentic-commerce-step-4.md): authenticated unresolved-word search, comparison and explicit draft confirmation.
- [Explainable suggestions](docs/agentic-commerce-step-5.md): current-request category explanations with no history-based profiling or automatic draft changes.
- [Engineering rulebook](.agents/README.md): security boundaries and agent execution restrictions.

Privacy contact: kajugadaniels@gmail.com. Cleanup is developer-run, not automatically scheduled. Full family/account deletion has no self-service UI; an operator procedure is still needed. Backups and provider logs have separate retention. Review privacy/child-related obligations before any real users.

Source inventory: 150 products, 142 reviewed Cloudinary photo mappings, eight category-icon fallbacks. Seeding does not approve child suitability. No real retailer inventory, live prices, logistics, subscriptions or production payments are in scope.

## Licensing

- Application source: [MIT](LICENSE), copyright 2026 Daniels KAJUGA.
- [Derivative catalog](prisma/catalog/catalog.us.json): [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/), attributed to Open Food Facts/Open Prices contributors and CareBasket curated data. Individual source contents: [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/).
- Reviewed photos: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), with per-asset sources in [ATTRIBUTION.md](public/products/ATTRIBUTION.md), including Cloudinary photos. Packages/fonts retain their own licenses.

MIT does not relicense datasets, images or third-party materials. The data-sources page offers the derivative catalog; contributor identities, receipts, proof images and comments are not redistributed.
