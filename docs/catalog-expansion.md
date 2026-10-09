# Catalog expansion toward 150 home essentials

## Implemented

Discovery now shares its candidate budget across all 11 category searches and samples different category tags before deeper pages. The enrichment budget is interleaved across categories too. Each category still makes at most the configured number of price requests; sparse categories may leave capacity unused. The report and CLI show candidate/photo coverage by category. These counts describe the discovery run, not the seeded catalog, and image URLs still require review.

Both catalog views now support Previous and More navigation with server-side search/category filters. Backward queries use an exclusive ID boundary, descending retrieval, and ascending display order. No offset, total-count query, new dependency, database schema change, live requester API fetch, or extra client-side state is introduced. Pages default to 24 products and read at most 50 rows including lookahead. Catalog changes between page visits can change results; this is not a snapshot.

The API rule now explicitly permits pagination on `/shop/products`; requester history remains short and fixed. Authentication, price-free requester DTOs, child suitability, safe product exclusions, rate limits, licensed local photos, and human price approval remain unchanged. Existing products and photos were not edited. The Prisma reference guided bounded queries; the React/Next.js and frontend-design references guided reuse of server-rendered, labelled controls and existing styling.

**The catalog has not been expanded to 150 approved products yet.** Discovery cannot guarantee that the public sources contain every household essential or a usable photo. Do not replace the reviewed catalog with the candidate report, fabricate source records, auto-approve prices, or treat discovery counts as complete market coverage.

## Coverage checklist

Aim for roughly 150 useful products, prioritizing missing essentials rather than more brands of the same item. Preserve already reviewed products and photos. Rice, dry beans, canned beans and lentils belong in PANTRY; fresh green beans belong in PRODUCE; frozen green beans belong in FROZEN.

| Category | Essentials to check during review |
| --- | --- |
| PRODUCE | Onions, potatoes, tomatoes, carrots, leafy greens, apples, bananas, citrus, berries |
| DAIRY_EGGS | Milk, lactose-free milk, plant drinks, eggs, yogurt, cheese, butter |
| BAKERY | Bread, whole-grain bread, rolls, tortillas, bagels |
| PANTRY | White/brown rice, dry/canned beans, lentils, pasta, flour, canned tomatoes/vegetables, cooking oil, salt, spices, sauces |
| BREAKFAST | Oats, cereal, granola, pancake mix |
| MEAT_SEAFOOD | Chicken, beef, turkey, fish, canned fish |
| FROZEN | Vegetables, fruit, fish, simple frozen meals |
| SNACKS | Crackers, biscuits, nuts, dried fruit, popcorn |
| BEVERAGES | Water, tea, coffee, juice |
| HOUSEHOLD | Toilet paper, paper towels, tissues, rubbish bags, food-storage bags, sponges, nonhazardous cleaning supplies |
| PERSONAL_CARE | Soap, shampoo, toothpaste, toothbrushes, deodorant, menstrual products |

This is a review checklist, not approval to add unsupported source tags, unsafe products or an unlimited catalog. Medicines, alcohol, weapons and hazardous chemicals stay excluded. Pantry and non-food source gaps may require separately reviewed manual demo records with honest provenance; source-derived photos must never be attached to a different product. A category placeholder remains preferable to a misleading photo. Child visibility requires explicit suitability review, not a blanket flag change.

## Next developer steps

First run verification (nothing was executed by the agent):

```bash
npm run lint
npx tsc --noEmit
npx vitest run src/features/catalog
npm run build
```

Then preserve your current candidate report if you still need it and run broader discovery:

```bash
cp .catalog-output/candidates.us.json .catalog-output/candidates.before-expansion.json
node --conditions=react-server --import tsx scripts/catalog/discover.ts --pages 5 --candidates 200 --enrichments 100
```

The 200-candidate review pool is not a target of 200 seeded products. This run makes at most 55 price-page requests and 100 enrichment requests, in addition to bounded location verification. Existing source throttling/retry/timeout rules still apply; discovery is an offline task, not an interactive endpoint. Check the category coverage and `reviewItems`; share the resulting report to continue selecting approximately 100 additions to the existing 50. Photos, demo prices, variants, synonyms and child suitability need review before appending records to `prisma/catalog/catalog.us.json`. Deduplicate by SKU/barcode, keep existing image metadata, and do not invent approvals.

Only after that curation and explicit photo review:

```bash
node --conditions=react-server --import tsx scripts/catalog/import-images.ts
node --conditions=react-server --import tsx scripts/catalog/import-images.ts --apply
npx vitest run src/features/catalog/server/curated-schema.test.ts
npx prisma db seed --config prisma7.config.ts
```

Restart/redeploy after seeding to invalidate the public catalog cache. Check search and category changes reset pagination, Previous/More retain filters and the draft, first/last and empty windows remain navigable, requester pages contain no prices, and children see only reviewed suitable products. No migrations are needed for this change. Tests, lint, types, build, source discovery, photo downloads, database contents, browser accessibility and performance have not been verified.

## Changed files and suggested commits

Files below comprise this task's implementation, tests, rule clarification, and completion guide. Existing changes to `prisma/catalog/catalog.us.json`, `public/products/ATTRIBUTION.md` and the downloaded JPGs are preserved and excluded from these commands. Run Git commands yourself, with no unrelated staged changes; the agent performed no Git writes.

```bash
```
