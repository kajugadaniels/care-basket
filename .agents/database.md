# Database (Neon PostgreSQL + Prisma 7)

**Purpose:** Define how CareBasket models, accesses, migrates, and retains data in Neon PostgreSQL using Prisma ORM 7.
**Applies to:** Schema changes, queries, repositories, seed data, migrations.
**Related:** [security.md § 3](security.md#3-family-isolation-and-object-ownership), [privacy.md § 7](privacy.md#7-deletion-and-retention), [payments.md](payments.md), [authentication.md](authentication.md)
**Last reviewed:** 2026-10-08

---

## 1. Ownership and execution

- Agents may edit `prisma/schema.prisma` and `prisma/seed.ts` **only when the task explicitly asks for a schema or seed change**.
- **Only the developer runs** `prisma generate`, `prisma migrate dev|deploy|reset`, `prisma db push|seed`, `prisma studio`, or any SQL ([workflow.md § 1.1](workflow.md#11-agents-must-not-execute)). Agents provide the exact commands.
- Each schema change in a task is accompanied by: the migration name to use, whether it is destructive, and any data backfill needed.

## 2. Prisma 7 configuration

Current state of the repository:

- `prisma/schema.prisma` uses the `prisma-client` generator with output `../src/generated/prisma` (git-ignored). Import the client from `@/generated/prisma/client`.
- The datasource URL is not in the schema (Prisma 7). The CLI reads it from the config file.
- The config file is named **`prisma7.config.ts`**. Prisma discovers `prisma.config.ts` by default, so every CLI command must pass `--config prisma7.config.ts` until the developer renames the file. Renaming it to `prisma.config.ts` is recommended.
- In the installed Prisma 7.10, the config `datasource` accepts `url` and `shadowDatabaseUrl` only; there is no `directUrl`.

Required connection setup:

| Use | Variable | Neon endpoint |
| --- | --- | --- |
| Runtime queries (`PrismaPg` adapter in `src/server/db/client.ts`) | `DATABASE_URL` | **Pooled** connection string (host contains `-pooler`) |
| Prisma CLI: migrations, introspection (`datasource.url` in the config file) | `DIRECT_URL` | **Direct** (unpooled) connection string |

The config currently points `datasource.url` at `DATABASE_URL`. It should use `DIRECT_URL` so migrations bypass the pooler. That is a developer decision to apply.

Runtime client rules:

- Exactly one `PrismaClient`, created in `src/server/db/client.ts` with `new PrismaPg({ connectionString })` and cached on `globalThis` in development to survive hot reloads.
- `src/server/db/client.ts` starts with `import 'server-only'`.
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

- **Referential integrity:** every relation declares `onDelete`. The family is the deletion root: family-owned rows use `Cascade` from `Family`. `BasketItem → Product` uses `Restrict`; products are archived (`archivedAt`), never deleted.
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

```prisma
// Identity and family
User              { id; clerkUserId @unique; createdAt; updatedAt }
Family            { id; name VarChar(60); createdAt; updatedAt }
FamilyMembership  { id; familyId; userId @unique /* MVP: one family per adult */;
                    role FamilyRole /* OWNER | MANAGER */; displayName VarChar(40);
                    createdAt; @@unique([familyId, userId]) }
ManagedProfile    { id; familyId; displayName VarChar(40); kind ProfileKind /* ASSISTED_ADULT | CHILD */;
                    avatarKey VarChar(30); locale VarChar(10) @default("en");
                    consentConfirmedAt; consentVersion VarChar(20); createdByUserId;
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

// Catalog (demo merchant)
Product           { id; sku @unique VarChar(40); name VarChar(80); unitLabel VarChar(30);
                    category ProductCategory; priceMinor Int; currency Char(3);
                    imagePath VarChar(200); synonyms String[]; isAvailable Boolean;
                    sortOrder Int; archivedAt?; createdAt; updatedAt }

// Requests and baskets
ShoppingRequest   { id; familyId; profileId; deviceId? /* SetNull on device deletion */;
                    clientRequestKey Uuid /* idempotency, see api.md § 6 */;
                    inputMode InputMode /* VOICE | TEXT | PICTURES */; inputText VarChar(500)?;
                    status RequestStatus /* PENDING_REVIEW | AWAITING_PAYMENT | PAID | DECLINED | CANCELLED */;
                    fulfillmentStatus FulfillmentStatus /* NOT_STARTED | PREPARING | DELIVERED (simulated) */;
                    reviewedByUserId?; reviewedAt?; submittedAt; createdAt; updatedAt;
                    @@unique([profileId, clientRequestKey]);
                    @@index([familyId, status, createdAt]); @@index([profileId, createdAt]) }
ShoppingBasket    { id; requestId @unique; familyId; currency Char(3);
                    subtotalMinor Int; lockedAt?; createdAt; updatedAt }
BasketItem        { id; basketId; productId; quantity Int; unitPriceMinor Int;
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
- **Prices are snapshotted** into `BasketItem.unitPriceMinor` at submission and re-validated against `Product.priceMinor` when checkout starts.

## 6. Access boundaries, queries, and performance

- Prisma is used only in `src/server/db/client.ts` and in `features/*/server/repository.ts` files ([architecture.md § 5](architecture.md#5-layers-and-dependency-direction)).
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
- Migrations and `schema.prisma` are committed together. `src/generated/prisma` is never committed.
- Demo and production databases are migrated only with `prisma migrate deploy`. Never run `migrate dev`, `db push`, or `migrate reset` against the demo database.
- Use separate Neon branches or databases for local development and the public demo.

## 8. Seed data

- `prisma/seed.ts` seeds the **demo merchant catalog**: fictional products with SKUs, names, unit labels, categories, synonyms, USD prices in cents, and local image paths in `public/products/`.
- Seeds are idempotent (`upsert` by `sku`), so the developer can re-run them safely.
- Seeds contain **no real personal data**. Any development family seeded for convenience uses clearly fictional names and only runs when an explicit flag is set; it never runs against the demo database.
- The catalog is the single source of truth for products and prices. AI never adds products ([ai.md](ai.md)).

## 9. Sensitive data, deletion, and retention

- Store hashes, never raw values, for device tokens, pairing secrets, and pairing codes ([authentication.md § 8](authentication.md#8-device-sessions)).
- Never store audio, payer details, card data, or full webhook payloads.
- `inputText` (typed text or transcript) is personal data; handle it per [privacy.md](privacy.md).
- Deletion and retention periods are defined in [privacy.md § 7](privacy.md#7-deletion-and-retention). Implement purges as explicit, developer-run maintenance until a scheduled job is approved.

## 10. Prohibited patterns

- `Float` for money, or prices sourced from anywhere other than `Product`
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
