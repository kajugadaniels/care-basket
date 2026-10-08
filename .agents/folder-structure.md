# Folder Structure and Naming

**Purpose:** Keep the codebase predictable: where each kind of code lives, how files are named, how imports work, and how big files may grow.
**Applies to:** Creating, moving, or renaming any file.
**Related:** [architecture.md § 5](architecture.md#5-layers-and-dependency-direction), [design.md](design.md), [testing.md](testing.md)
**Last reviewed:** 2026-10-08

---

## 1. Recommended tree

This is the target layout. **Create directories only when the first real file needs them.** Do not create empty feature folders.

```
.
├── AGENTS.md / CLAUDE.md             # agent entry points → .agents/README.md
├── .agents/                          # rulebook (this directory) and skills
├── prisma/
│   ├── schema.prisma
│   ├── migrations/                   # created by the developer's migrate commands
│   ├── catalog/catalog.us.json       # curated U.S. catalog, ODbL (catalog.md § 8, § 10)
│   └── seed.ts                       # idempotent, offline catalog seed (developer runs it)
├── prisma7.config.ts                 # Prisma CLI config (see database.md § 2)
├── scripts/
│   └── catalog/                      # developer-run: discover.ts, refresh-observations.ts
├── public/
│   └── products/                     # curated product images + ATTRIBUTION.md (CC BY-SA 3.0)
└── src/
    ├── proxy.ts                      # Clerk route protection (Next 16 "proxy")
    ├── instrumentation.ts            # optional: onRequestError logging
    ├── app/
    │   ├── layout.tsx                # html/body, fonts, global CSS
    │   ├── globals.css               # reset + design tokens only
    │   ├── page.tsx                  # public landing
    │   ├── (auth)/sign-in/[[...sign-in]]/page.tsx
    │   ├── (auth)/sign-up/[[...sign-up]]/page.tsx
    │   ├── (manager)/family/…        # adult area (Clerk session)
    │   ├── (device)/shop/…           # requester area (device session)
    │   ├── connect/page.tsx          # device pairing start (public)
    │   ├── privacy/page.tsx          # plain-language privacy page (public)
    │   ├── data-sources/page.tsx     # data attribution and licenses (public)
    │   └── api/
    │       ├── webhooks/paypal/route.ts
    │       ├── assistant/voice/route.ts
    │       └── pairing/status/route.ts
    ├── features/
    │   ├── family/
    │   ├── profiles/
    │   ├── devices/                  # pairing + authorized devices
    │   ├── catalog/                  # config.ts (market defaults), catalog reads, normalizer
    │   ├── requests/                 # shopping requests + baskets
    │   ├── assistant/                # AI workflow, units, budget fitting, keyword matcher, voice UI
    │   └── checkout/                 # PayPal checkout, payments, webhooks
    ├── components/
    │   ├── ui/                       # Button, Card, Dialog, Field, Badge, …
    │   └── layout/                   # PageHeader, Container, …
    ├── server/
    │   ├── auth/                     # actor resolution, permissions, device session
    │   ├── db/client.ts              # single PrismaClient
    │   ├── audit/                    # audit log writer
    │   ├── rate-limit/               # Postgres-backed limiter
    │   ├── errors.ts                 # AppError
    │   └── logger.ts                 # structured, redacting logger
    ├── lib/
    │   ├── env/{server.ts,client.ts} # Zod-validated environment
    │   ├── paypal/                   # PayPal REST client, webhook verification
    │   ├── ai/                       # provider interface, Gemini adapter, prompts, schemas
    │   ├── open-prices/              # Open Prices API client and source types
    │   ├── open-food-facts/          # secondary metadata adapter
    │   ├── money.ts                  # minor-unit helpers (pure)
    │   └── format.ts                 # Intl formatting helpers (pure)
    ├── types/                        # only genuinely shared types
    ├── test/                         # test setup file and data factories (fictional data only)
    └── generated/prisma/             # Prisma Client output (git-ignored, never edited)
```

Route group names (`(manager)`, `(device)`, `(auth)`) do not appear in URLs. Public URLs are `/family/…`, `/shop/…`, `/connect`, `/sign-in`, `/sign-up`.

## 2. Inside a feature

```
src/features/requests/
├── components/
│   ├── RequestCard/
│   │   ├── RequestCard.tsx
│   │   ├── RequestCard.module.css
│   │   └── RequestCard.test.tsx
│   └── BasketSummary/…
├── server/
│   ├── service.ts            # 'server-only' — business rules, transitions
│   ├── service.test.ts
│   └── repository.ts         # 'server-only' — Prisma, family-scoped
├── actions.ts                # 'use server' — thin entry points
├── schemas.ts                # Zod schemas shared by actions and forms
├── types.ts                  # DTOs exposed to UI
├── copy.ts                   # user-facing strings for this feature
└── hooks/use-request-status.ts   # client hooks, if any
```

- A feature's `server/repository.ts` is **private** to that feature. Other features call its `server/service.ts`.
- Split a growing `service.ts` by use case (`submit-request.ts`, `review-request.ts`) inside `server/`, not into new top-level folders.

## 3. Placement rules

| Code | Location |
| --- | --- |
| Used by one feature only | Inside that feature |
| UI used by two or more features, with no domain knowledge | `src/components/` |
| Server infrastructure used across features | `src/server/` |
| Third-party integration or pure utility | `src/lib/` |
| Type shared across three or more modules in different layers | `src/types/` (otherwise keep it local) |
| Route-only composition | `src/app/` |
| Developer-run maintenance (catalog discovery, refresh) | `scripts/` (never imported by app code) |
| Curated catalog data (ODbL) | `prisma/catalog/` |
| Generated code | `src/generated/` (never edited by hand) |

## 4. Naming conventions

| Item | Convention | Example |
| --- | --- | --- |
| React component file and folder | PascalCase | `RequestCard/RequestCard.tsx` |
| CSS Module | Same name as component | `RequestCard.module.css` |
| CSS Module class names | camelCase | `styles.primaryAction` |
| Other modules | kebab-case | `device-session.ts`, `use-recorder.ts` |
| Hooks | `use-` file, `useX` export | `use-recorder.ts` → `useRecorder` |
| Route segments | kebab-case | `/family/requests/[requestId]` |
| Dynamic params | camelCase with `Id` suffix | `[requestId]` |
| Server Actions | verb + noun + `Action` | `approvePairingAction` |
| Zod schemas | camelCase + `Schema` | `submitRequestSchema` |
| Types and interfaces | PascalCase, no `I` prefix | `BasketItemDto` |
| Constants | `SCREAMING_SNAKE_CASE` for true constants | `PAIRING_CODE_TTL_MS` |
| Booleans | `is`/`has`/`can` prefix | `canPay` |
| Tests | colocated `*.test.ts(x)` | `service.test.ts` |
| Prisma models and enums | see [database.md § 3](database.md#3-modeling-conventions) | `ShoppingRequest` |

## 5. Import rules

- Use the `@/` alias (maps to `src/`) for imports across directories. Use relative imports only within the same feature folder.
- Import from the specific module. **No barrel `index.ts` files** that re-export mixed server and client code; they leak server modules into client bundles.
- The Prisma Client instance is imported only from `@/server/db/client`. Generated Prisma types (`@/generated/prisma/client`) may be imported only in repositories and `src/server/`.
- Hugeicons are imported per icon: `import { ShoppingBasket01Icon } from '@hugeicons/core-free-icons'`.
- Import order: external packages, then `@/` imports, then relative imports, then styles.

## 6. File size and decomposition

| File type | Soft limit | Action when exceeded |
| --- | --- | --- |
| Component (`.tsx`) | 150 lines | Extract subcomponents |
| Service or repository | 250 lines | Split by use case |
| Any file | 400 lines | MUST be split before adding more |

- One exported component per file. Small private subcomponents in the same file are allowed while the file stays under the limit.
- A file does one job: rendering, business rules, data access, or integration, never several.

## 7. Prohibited patterns

- Monolithic files (pages with inline queries, styles, and logic)
- `utils.ts` or `helpers.ts` grab-bags; name modules by purpose (`money.ts`, `format.ts`)
- Global component styles in `globals.css`
- Empty placeholder directories or files
- Deep relative imports such as `../../../`
- Duplicated components that differ only in styling (use a variant prop)

## 8. Acceptance criteria

- [ ] New files are in the location the table in §3 dictates.
- [ ] Names follow §4.
- [ ] Each substantial component has its own `.module.css`.
- [ ] No file exceeds 400 lines; components stay near 150.
- [ ] No server-only module is reachable from a `'use client'` file.
