# Database (Neon PostgreSQL + Prisma 7)

**Purpose:** Define how CareBasket models, accesses, migrates, and retains data in Neon PostgreSQL using Prisma ORM 7.
**Applies to:** Schema changes, queries, repositories, seed data, migrations.
**Related:** [catalog.md](catalog.md), [security.md § 3](security.md#3-family-isolation-and-object-ownership), [privacy.md § 7](privacy.md#7-deletion-and-retention), [payments.md](payments.md), [authentication.md](authentication.md)
**Last reviewed:** 2026-10-09

---

## 1. Ownership and execution

- Agents may edit `prisma/schema.prisma` and `prisma/seed.ts` **only when the task explicitly asks for a schema or seed change**.
- **Only the developer runs** `prisma generate`, `prisma migrate dev|deploy|reset`, `prisma db push|seed`, `prisma studio`, or any SQL ([workflow.md § 1.1](workflow.md#11-agents-must-not-execute)). Agents provide the exact commands.
- Each schema change in a task is accompanied by: the migration name to use, whether it is destructive, and any data backfill needed.

## 2. Prisma 7 configuration

Current state of the repository:

- `prisma/schema.prisma` uses the `prisma-client` generator with output `../src/generated/prisma` (git-ignored). Import the client from `@/generated/prisma/client`.
- The datasource URL is not in the schema (Prisma 7). The CLI reads it from the config file.
- The config file is named **`prisma7.config.ts`** (kept by developer decision). Prisma discovers `prisma.config.ts` by default, so every CLI command passes `--config prisma7.config.ts`.
- In the installed Prisma 7.10, the config `datasource` accepts `url` and `shadowDatabaseUrl` only; there is no `directUrl`.
- **Env loading:** Prisma 7 does not load env files itself. `prisma7.config.ts` quietly loads `.env.local` by default or `.env.production` when `NODE_ENV=production`; shell variables win over the selected file. This matches the two committed templates without mixing local and production credentials.

Required connection setup:

| Use | Variable | Neon endpoint |
| --- | --- | --- |
| Runtime queries (`PrismaPg` adapter in `src/server/db/client.ts`) | `DATABASE_URL` | **Pooled** connection string (host contains `-pooler`) |
| Prisma CLI: migrations, introspection (`datasource.url` in the config file) | `DIRECT_URL` | **Direct** (unpooled) connection string |

`prisma7.config.ts` points `datasource.url` at `DIRECT_URL`, so migrations bypass the pooler.

Runtime client rules:

- Exactly one `PrismaClient`, created lazily by `getDb()` in `src/server/db/client.ts` with `new PrismaPg({ connectionString })`, using `DATABASE_URL` validated by `src/lib/env/server.ts`, and kept on `globalThis` so hot reloads reuse it. Nothing connects at import time.
- `src/server/db/client.ts` starts with `import 'server-only'`.
- Unique-constraint violations are detected with `isUniqueConstraintViolation()` (`src/server/db/errors.ts`, Prisma code `P2002`).
- `prisma migrate dev` in Prisma 7 does not regenerate the client; run `prisma generate` after every schema change. Tests and type checks need the generated client.
- `@prisma/adapter-pg` is the approved adapter. Switching to another adapter (for example Neon's serverless driver) needs approval.
- Seed command is configured in the Prisma config under `migrations.seed` (for example `tsx prisma/seed.ts`; `tsx` is installed).

## 3. Modeling conventions

| Item | Convention |
| --- | --- |
| Models | PascalCase, singular (`ShoppingRequest`) |
| Fields | camelCase (`createdAt`, `familyId`) |
| Enums | PascalCase type, `SCREAMING_SNAKE_CASE` values (`RequestStatus.PENDING_REVIEW`) |
| Table and column names | Prisma defaults (no `@map` / `@@map`). Quote identifiers in any raw SQL. |
| Primary keys | `id String @id @default(uuid(7)) @db.Uuid` (time-ordered UUIDv7) |
| Foreign keys | `<relation>Id String @db.Uuid`, with an explicit `onDelete` on every relation |
| Timestamps | `createdAt DateTime @default(now()) @db.Timestamptz(3)` and `updatedAt DateTime @updatedAt @db.Timestamptz(3)` on mutable models |
| Lifecycle events | Nullable timestamps (`approvedAt`, `revokedAt`, `capturedAt`) instead of booleans |
| Money | `Int` in **minor units** (cents) plus `currency String @db.Char(3)`. Never `Float`. |
| Text | Explicit `@db.VarChar(n)` where a limit exists; the same limit is enforced in Zod |
| Status | Prisma enums, never free strings |
| Flexible data | `Json` only for audit metadata and minimal event summaries, never for queryable business fields |

## 4. Integrity, constraints, and transactions

- **Referential integrity:** every relation declares `onDelete`. The family is the deletion root: family-owned rows use `Cascade` from `Family`. `BasketItem → CatalogProduct` uses `Restrict`; catalog products are archived (`archivedAt`), never deleted. `DemoMerchantPrice` and `PriceObservation` cascade from `CatalogProduct`.
- **Uniqueness:** enforce business uniqueness in the database, not only in code (see the `@unique` markers in §5).
- **Check constraints** (quantity > 0, amounts ≥ 0) SHOULD be added as raw SQL inside a migration created with `--create-only`, since Prisma does not model them. Zod validation remains the first line of defence.
- **Transactions:** use interactive `prisma.$transaction(async (tx) => …)` for multi-row invariants:
  - family + owner membership creation
  - pairing completion + device creation
  - request submission + basket + items
  - checkout start (lock basket + create or reuse payment)
  - recording a verified capture (payment + request status + payment event + audit)
- **No external calls inside transactions.** Call PayPal or Gemini first, then open a short transaction to persist the result.
- **State transitions use conditional updates** for optimistic concurrency: `updateMany({ where: { id, familyId, status: 'EXPECTED' }, data })` and require `count === 1`; otherwise throw `CONFLICT`. Status never moves backwards.

## 5. Planned models

These are **proposed concepts, not a mandate**. Add a model only when a task needs it, and keep fields minimal. The sketch below is illustrative, not final schema.

**Implemented (Step 3, see `prisma/schema.prisma`):** `User`, `Family`, `FamilyMembership`, and the `FamilyRole` enum. Membership cascades from both `Family` and `User`; `userId` is unique (one family per adult) and `(familyId, userId)` is unique as well. Family creation and its `OWNER` membership share one interactive transaction (`features/family/server/repository.ts`). Everything else below is still planned.

```prisma
// Identity and family (implemented)
User              { id; clerkUserId @unique; createdAt; updatedAt }
Family            { id; name VarChar(60); createdAt; updatedAt }
FamilyMembership  { id; familyId; userId @unique /* MVP: one family per adult */;
                    role FamilyRole /* OWNER | MANAGER */; displayName VarChar(40);
                    createdAt; @@unique([familyId, userId]) }
ManagedProfile    { id; familyId; displayName VarChar(40); kind ProfileKind /* ASSISTED_ADULT | CHILD */;
                    avatarKey VarChar(30); locale VarChar(10) @default("en-US");
                    consentConfirmedAt; consentVersion VarChar(20); createdByUserId;
                    aiAssistEnabled Boolean @default(false) /* ASSISTED_ADULT only, see ai.md § 8 */;
                    aiConsentConfirmedAt?; aiConsentVersion VarChar(20)?;
                    createdAt; updatedAt; @@index([familyId]) }

// Devices
DevicePairing     { id; codeHash; secretHash; status PairingStatus /* PENDING | APPROVED | REJECTED | COMPLETED | EXPIRED */;
                    expiresAt; userAgentSummary VarChar(80);
                    familyId?; profileId?; approvedByUserId?; approvedAt?; completedAt?; createdAt;
                    @@index([codeHash, status]) }
AuthorizedDevice  { id; familyId; profileId; label VarChar(40); tokenHash @unique;
                    userAgentSummary VarChar(80); approvedByUserId;
                    lastSeenAt; expiresAt; revokedAt?; revokedByUserId?; createdAt;
                    @@index([profileId]) }

// Catalog (see catalog.md) — MVP core: CatalogProduct + DemoMerchantPrice
CatalogProduct    { id; sku @unique VarChar(60); barcode? @unique VarChar(14);
                    displayName VarChar(60); brand VarChar(60)?; category ProductCategory;
                    variantGroup VarChar(60); netQuantity Int; netQuantityUnit QuantityUnit /* GRAM | MILLILITER | COUNT */;
                    sizeLabel VarChar(40); synonyms String[];
                    imagePath VarChar(200)?; imageSourceUrl VarChar(300)?; imageLicense VarChar(40)?; imageAttribution VarChar(120)?;
                    source CatalogSource /* OPEN_PRICES | OPEN_FOOD_FACTS | CAREBASKET_CURATED */;
                    sourceProductId Int?; sourceProductCode VarChar(14)?; sourceLicense VarChar(40);
                    isActive Boolean; sortOrder Int; archivedAt?; createdAt; updatedAt;
                    @@index([category, isActive]); @@index([variantGroup]) }
DemoMerchantPrice { id; productId; currency Char(3); priceMinor Int;
                    basis PriceBasis /* OBSERVED_MEDIAN | OBSERVED_LIMITED | MANUAL_DEMO */;
                    observationCount Int?; observedFrom Date?; observedTo Date?;
                    approvedAt; createdAt; updatedAt; @@unique([productId, currency]) }
// Optional until reference prices or the refresh script are implemented
PriceObservation  { id; productId; sourcePriceId Int @unique; priceMinor Int; currency Char(3);
                    observedOn Date; isDiscounted Boolean; locationId Int; locationCountryCode Char(2);
                    fetchedAt; @@index([productId, observedOn]) }
CatalogSyncRun    { id; kind VarChar(30) /* discover | refresh */; source CatalogSource;
                    startedAt; finishedAt?; status VarChar(20); counts Json /* fetched, upserted, skipped by reason */;
                    errorSummary VarChar(500)? }

// Requests and baskets
ShoppingRequest   { id; familyId; profileId; deviceId? /* SetNull on device deletion */;
                    clientRequestKey Uuid /* idempotency, see api.md § 6 */;
                    inputMode InputMode /* VOICE | TEXT | PICTURES */; inputText VarChar(1000)?;
                    budgetMinor Int? /* optional per-request budget, USD cents, ai.md § 10.3 */;
                    status RequestStatus /* PENDING_REVIEW | AWAITING_PAYMENT | PAID | DECLINED | CANCELLED */;
                    fulfillmentStatus FulfillmentStatus /* NOT_STARTED | PREPARING | DELIVERED (simulated) */;
                    reviewedByUserId?; reviewedAt?; submittedAt; createdAt; updatedAt;
                    @@unique([profileId, clientRequestKey]);
                    @@index([familyId, status, createdAt]); @@index([profileId, createdAt]) }
ShoppingBasket    { id; requestId @unique; familyId; currency Char(3);
                    subtotalMinor Int; lockedAt?; createdAt; updatedAt }
BasketItem        { id; basketId; productId /* CatalogProduct, Restrict */; quantity Int;
                    unitPriceMinor Int /* snapshot of DemoMerchantPrice */;
                    origin ItemOrigin /* REQUESTED | SUGGESTED */;
                    isSubstitute Boolean; substitutionNote VarChar(120)?;
                    @@unique([basketId, productId]) }

// Payments
Payment           { id; familyId; requestId; basketId /* one OPEN payment per basket, see payments.md § 5 */;
                    status PaymentStatus /* CREATED | APPROVED | PENDING | CAPTURED | DENIED | VOIDED | REFUNDED */;
                    amountMinor Int; currency Char(3);
                    paypalOrderId? @unique /* set after PayPal creates the order */; paypalCaptureId? @unique;
                    initiatedByUserId; capturedAt?; createdAt; updatedAt;
                    @@index([basketId]); @@index([requestId]) }
PaymentEvent      { id; paymentId?; source PaymentEventSource /* CAPTURE_RESPONSE | WEBHOOK | SYSTEM */;
                    paypalEventId? @unique; eventType VarChar(80); resourceId VarChar(60)?;
                    resourceStatus VarChar(40)?; amountMinor Int?; currency Char(3)?;
                    summary Json?; verifiedAt?; receivedAt; processedAt? }

// Infrastructure
AuditLog          { id; familyId?; actorType ActorType /* ADULT | DEVICE | SYSTEM | WEBHOOK */; actorId?;
                    action VarChar(60); targetType VarChar(40)?; targetId?; metadata Json?; createdAt;
                    @@index([familyId, createdAt]) }
RateLimitCounter  { key VarChar(128); windowStart DateTime; count Int; expiresAt;
                    @@id([key, windowStart]); @@index([expiresAt]) }
```

Design notes:

- **ShoppingRequest vs. ShoppingBasket:** the request holds what was asked and its workflow; the basket holds priced items. They are 1:1 in the MVP. The basket is editable during review and immutable while `lockedAt` is set, from checkout start until the checkout is cancelled or the payment is denied ([payments.md § 3](payments.md#3-payment-workflow)).
- **No draft table:** before submission, the AI proposal lives in the requester's client state. On submit, the server re-validates SKUs and quantities and creates the request, basket, and items in one transaction.
- **Request `status` vs. `Payment.status`:** the request becomes `PAID` only inside the same transaction that records a verified capture. `fulfillmentStatus` is separate and simulated; it never changes because of payment events.
- **No email or payer details** are stored. Clerk holds adult emails; PayPal holds payer data.
- **Two kinds of price, never mixed:** `DemoMerchantPrice` is the only checkout price; `PriceObservation` is reference data from Open Prices and is never read for totals ([catalog.md § 6](catalog.md#6-observed-prices-vs-demo-merchant-prices)).
- **Prices are snapshotted** into `BasketItem.unitPriceMinor` from `DemoMerchantPrice` at submission and re-validated against it when checkout starts.
- **Item origin** records whether the requester asked for an item or accepted an AI suggestion, so the manager can tell them apart.
- **Smallest schema first:** create `CatalogProduct` and `DemoMerchantPrice` with the catalog feature; add `PriceObservation` and `CatalogSyncRun` only when reference prices or the refresh script are built. Sources are an enum, not a table.

## 6. Access boundaries, queries, and performance

- Prisma is used only in `src/server/db/client.ts`, in `features/*/server/repository.ts` files, and in cross-cutting `src/server/` data modules such as `src/server/users/user-repository.ts` and `src/server/auth/family-membership.ts` ([architecture.md § 5](architecture.md#5-layers-and-dependency-direction)).
- Every repository function for family-owned data takes `familyId` (and `profileId` for device scope) as a required argument and includes it in `where`.
- Always `select` the fields you need. Never return whole records to services that pass them to the UI.
- Avoid N+1 queries: fetch relations with `include`/`select` or batch with `in`.
- Paginate lists with a cursor on `id` (UUIDv7 is time-ordered), `take ≤ 50`.
- Index every foreign key used in filters and every `(familyId, status, createdAt)` style list query.
- Raw SQL (`$queryRaw`) only with tagged-template parameters, never string concatenation, and only when Prisma cannot express the query (for example, the atomic rate-limit upsert).
- Neon databases may suspend when idle; the first query after idle is slower. Do not add retries for it; warm the demo before presenting ([deployment.md § 7](deployment.md#7-demo-availability)).

## 7. Migrations

- The developer creates migrations with `npx prisma migrate dev --name <snake_case_description> --config prisma7.config.ts`, for example `add_device_pairing`.
- One logical change per migration. Name it for what it does, not for the ticket.
- Never edit a migration that has been applied anywhere. Fix forward with a new migration.
- Destructive changes (drop or rename a column or table, tighten nullability) use two steps: expand (add new, backfill) and contract (remove old), and are flagged in the completion report.
- `schema.prisma` and its migration are committed in consecutive commits, schema first ([git.md § 2](git.md#2-changes)). `src/generated/prisma` is never committed.
- Demo and production databases are migrated only with `prisma migrate deploy`. Never run `migrate dev`, `db push`, or `migrate reset` against the demo database.
- Use separate Neon branches or databases for local development and the public demo.

## 8. Seed data

- `prisma/seed.ts` seeds the catalog from the committed, curated file `prisma/catalog/catalog.us.json` (ODbL), which holds `CatalogProduct` and approved `DemoMerchantPrice` data with source attribution ([catalog.md § 8](catalog.md#8-curation-and-import-pipeline)).
- The seed validates the file with Zod, upserts by `sku`, makes **no network calls**, and is idempotent, so the developer can re-run it safely.
- Catalog import and refresh are separate developer-run scripts, never part of seeding, migrations, or the request path.
- Seeds contain **no real personal data**. Any development family seeded for convenience uses clearly fictional names and only runs when an explicit flag is set; it never runs against the demo database.
- The curated catalog is the single source of truth for products and checkout prices. AI never adds or prices products ([ai.md § 3](ai.md#3-what-ai-must-not-do)).

## 9. Sensitive data, deletion, and retention

- Store hashes, never raw values, for device tokens, pairing secrets, and pairing codes ([authentication.md § 8](authentication.md#8-device-sessions)).
- Never store audio, payer details, card data, or full webhook payloads.
- `inputText` (typed text or transcript) is personal data; handle it per [privacy.md](privacy.md).
- Deletion and retention periods are defined in [privacy.md § 7](privacy.md#7-deletion-and-retention). Implement purges as explicit, developer-run maintenance until a scheduled job is approved.

## 10. Prohibited patterns

- `Float` for money, or checkout prices sourced from anywhere other than `DemoMerchantPrice`
- Reading `PriceObservation` to compute any total
- Source-specific fields (Open Prices or Open Food Facts response shapes) stored outside the documented provenance columns
- `findUnique({ where: { id } })` on family data without a family check in the same query
- Prisma imports outside the db client and repositories
- Long transactions or external calls inside transactions
- Editing applied migrations; `db push` against shared databases
- Booleans for lifecycle states that need a timestamp (`isRevoked`)
- Duplicate state that can drift (for example, storing a basket total that is not updated in the same transaction as its items)

## 11. Acceptance criteria

- [ ] New models follow §3 and include only fields a current feature needs.
- [ ] Every relation has an explicit `onDelete`; every filtered foreign key has an index.
- [ ] Invariants are enforced by unique constraints or conditional updates, not only by application code.
- [ ] Repositories are family-scoped and return selected fields only.
- [ ] The completion report lists the migration name and the exact developer commands.
