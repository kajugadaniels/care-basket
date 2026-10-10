# Curated U.S. catalog

This directory's derivative catalog data is offered under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Individual source contents are covered by [DbCL 1.0](https://opendatacommons.org/licenses/dbcl/1-0/). Attribute Open Food Facts and Open Prices contributors, and CareBasket for manually curated demo data. Application code has a separate licensing scope.

The current dataset contains 118 reviewed demo products with approved demo prices and 110 photo records. The latest approved 32 additions have been imported and seeded successfully according to the developer's supplied output. Eight earlier photo gaps remain. The target is 150 products, each with a reviewed name, a licensed local photo and an approved demo price: 32 more additions are needed. The [final 32-product proposal](final-32-review.md) selects varied essentials from the pantry discovery report and is pending developer approval; it is not seed input. Child suitability remains unapproved (`isChildSuitable: false`); do not change these flags without a separate safety review. The seed still refuses an empty dataset.

Reports are not approved seed input. All prices are fictional, explicitly approved prices for CareBasket Demo Market; historical observations never feed checkout directly.

## Find the next review batch

Run these commands manually from the project root. Discovery does not change the catalog, download photos or write to the database.

```bash
node --conditions=react-server --import tsx scripts/catalog/discover.ts --pages 5 --candidates 200 --enrichments 100 --new-only --ready-only
```

This writes `.catalog-output/candidates.review.us.json`. `--new-only` excludes existing catalog barcodes and source product IDs before assigning candidate capacity. `--ready-only` keeps normalized products with a permitted photo URL whose barcode directory matches the product, and a recent, non-discounted USD price suggestion. Photos, metadata and demo prices remain unapproved; a URL does not prove the photo is appropriate or downloadable. Products missing a matching photo or price suggestion are recorded as `HELD_FOR_COMPLETION` instead of counted as ready candidates. Existing safety, U.S. evidence, request caps and rate limits still apply.

To focus discovery on one category, add `--category PANTRY` (rice, beans, pasta and similar staples). This shares at most five source requests across that category's tags and writes `.catalog-output/candidates.review.pantry.us.json`. Other supported category names are defined in `src/features/catalog/taxonomy.ts`. Category selection filters source queries; the normalized product category may differ and must still be reviewed. Running again with the same selection replaces that review report only after a successful run. Different category selections have separate reports; deduplicate identities when combining them.

The source may not yield 64 eligible new products within these bounds. Do not fill a shortfall with duplicates, invented source records or placeholder images. `--new-only` deliberately excludes the eight existing photo gaps; those still need a separate image-enrichment run using the usual discovery command without the new-only filter.

## Review, import photos and seed

1. Review the report's product name, category, quantity, source evidence, image and license, then explicitly approve the chosen demo prices. Approval must come from the developer, not the discovery script.
2. Merge the approved records into `catalog.us.json` using its existing contract. Preserve previous approvals and use `image: null` until a reviewed photo is downloaded. Never copy discovery candidates directly into the seed file.
3. After merging approved products, copy the corresponding report to `.catalog-output/candidates.us.json`, which is the image importer's input. Keep category-specific reports so they can be processed separately. For the all-category batch:

   ```bash
   cp .catalog-output/candidates.review.us.json .catalog-output/candidates.us.json
   node --conditions=react-server --import tsx scripts/catalog/import-images.ts
   ```

4. Review the previewed photos and license, then import approved photos:

   ```bash
   node --conditions=react-server --import tsx scripts/catalog/import-images.ts --apply
   ```

5. Validate and seed, then restart/redeploy to invalidate the catalog cache:

   ```bash
   npm run lint
   npx tsc --noEmit
   npx vitest run src/features/catalog/server/discovery.test.ts src/features/catalog/server/curated-schema.test.ts
   npm run build
   npx prisma db seed --config prisma7.config.ts
   ```

Do not claim completion until 150 distinct approved catalog records have non-null photo metadata, every referenced local photo exists, and seeding succeeds. Candidate totals alone do not establish this.
