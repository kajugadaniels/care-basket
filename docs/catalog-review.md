# Catalog review — 2026-10-09

Status: **draft only; no products or prices have been approved.**

Source: the developer-generated `.catalog-output/candidates.us.json` report dated 2026-10-09.
Product data and the tables below are derived from Open Prices / Open Food Facts contributors and are offered under **ODbL 1.0**. See [catalog licensing](../.agents/catalog.md#10-licensing-and-attribution).

## Files and approval boundary

- Prepared draft: [curated-draft.us.json](../.catalog-output/curated-draft.us.json), kept local in the git-ignored report directory.
- Seed input: [catalog.us.json](../prisma/catalog/catalog.us.json), unchanged and still empty.
- Contract: [curated-schema.ts](../src/features/catalog/server/curated-schema.ts).
- Policy: [catalog.md](../.agents/catalog.md).

The draft resembles the seed contract, but intentionally has `demoPrice.approved: false` and `demoPrice.approvedAt: null`. It is **not valid seed input** until the developer reviews and approves the selected entries. The seed validator has not been weakened. Do not commit the candidate report or the local draft.

## Review results

Of the 81 normalized candidates, 50 were selected for a first review draft and 31 placed on hold. These decisions are based only on the supplied report, not independently verified package labels or fresh API requests.

The selected draft contains 23 produce products, 6 frozen products, 15 dairy/milk-alternative products, and 6 bakery products. Pantry, breakfast, meat/seafood, snacks, beverages, household, and personal-care categories have no selected products. This is not yet the intended 100–150-product catalog.

The discovery report counted 620 observations skipped at the candidate cap. It filled candidate slots before all categories could contribute, so increasing page count alone may not resolve the skew. A future category-balanced discovery change is separate work; this review does not modify the importer.

Eight selected demo-price suggestions have an `OBSERVED_MEDIAN` basis (at least three observations); 42 have an `OBSERVED_LIMITED` basis (one or two). These are historical suggestions, not live retailer prices or approved checkout prices.

## Draft decisions

- Preserve all source IDs, barcodes, verified observations, quantities, size labels, and suggested-price derivations exactly from the report.
- Preserve existing suggested SKUs so name cleanup does not silently change product identity.
- Simplify capitalization and wording; translate “Framboises” to “Raspberries” and “Mandarinas” to “Mandarins”, retaining the original words as synonyms.
- Propose semantic variant groups and lowercase search synonyms. These still need human review; milk fat levels, fresh versus frozen products, and bread varieties remain separate groups.
- Keep recorded brands rather than inventing replacements.
- Leave `isChildSuitable: false` for every entry until explicitly reviewed. This is conservative visibility, not a finding that every item is unsafe.
- Set `image: null` for every entry. Existing source image candidates have not been downloaded, inspected, or attributed as local assets. The current UI can use category placeholders; this would not satisfy a photo-complete catalog milestone.
- Do not fabricate manual prices, approval dates, source observations, quantities, or missing product coverage.
- Keep raw evidence separate from pricing: discounted observations are retained as provenance but were not included in the suggested median.

## Selected products — awaiting approval

Prices below are **proposals for CareBasket Demo Market**, not current retailer prices. Observation counts are the counts used for each suggestion, not all source observations.

| Source product ID | Proposed display name | Recorded brand | Recorded package size | Suggested demo price | Pricing observations |
| --- | --- | --- | --- | --- | --- |
| 4238179 | Shine Muscat | Not recorded | 21.16 oz (600 g) | $12.99 | 1 |
| 3484519 | Kiwi Berries | Little pranksters | 15.98 oz (453 g) | $5.99 | 2 |
| 2527655 | Blueberries | Fruitist Jumbo | 9.77 oz (277 g) | $5.99 | 4 |
| 3823301 | Organic Mango Chunks | Nature’s Touch | 79.97 oz (2,267 g) | $9.99 | 5 |
| 4175613 | Organic Blueberries | Pitaya Foods | 11.99 oz (340 g) | $6.99 | 1 |
| 2071835 | Organic Bananas | One | 47.97 oz (1,360 g) | $2.49 | 2 |
| 1749988 | Organic Blueberries | Kirkland | 47.97 oz (1,360 g) | $8.99 | 1 |
| 1495979 | Sweetest Batch Blueberries | Driscoll's | 10.97 oz (311 g) | $6.99 | 1 |
| 1803783 | Strawberries | Driscoll's | 31.99 oz (907 g) | $7.99 | 1 |
| 2152751 | Organic Blueberries | KIRKLAND Signature | 47.97 oz (1,360 g) | $8.89 | 3 |
| 706374 | Bananas | Delmonte Bag 30669 | 47.97 oz (1,360 g) | $1.99 | 2 |
| 2075389 | Organic Strawberries | Kirkland | 63.99 oz (1,814 g) | $11.99 | 3 |
| 4036696 | Wild Blueberries | Kirkland Signature | 79.97 oz (2,267 g) | $12.99 | 1 |
| 2457206 | Organic Blackberries | Driscoll's | 17.99 oz (510 g) | $8.99 | 1 |
| 2152000 | Organic Blueberries | Not recorded | 17.99 oz (510 g) | $7.99 | 1 |
| 1651824 | Organic Bananas | Dole | 47.97 oz (1,360 g) | $2.49 | 4 |
| 4207575 | Organic Blackberries | GreenBelle | 11.99 oz (340 g) | $4.89 | 2 |
| 1853431 | Organic SunGold Kiwifruit | Zespri | 15.98 oz (453 g) | $6.99 | 1 |
| 152912 | Organic Raspberries | Driscoll's | 6 oz (170 g) | $4.49 | 1 |
| 1413218 | Raspberries | Driscoll's | 11.99 oz (340 g) | $8.49 | 1 |
| 2259908 | Strawberries | Not recorded | 31.99 oz (907 g) | $4.99 | 1 |
| 152911 | Raspberries | Driscoll's | 11.99 oz (340 g) | $4.99 | 1 |
| 71174 | Mandarins | Sun Pacific | 47.97 oz (1,360 g) | $4.99 | 2 |
| 119321 | Pitted Dates | 365 Whole Foods Market | 7.97 oz (226 g) | $5.29 | 1 |
| 3454474 | Medjool Dates | Natural Delights | 23.99 oz (680 g) | $11.99 | 1 |
| 3268315 | Medjool Dates | Natural Delights | 80 oz (2,268 g) | $25.99 | 1 |
| 1427501 | Organic Pitted Deglet Noor Dates | DESERT VALLEY DATE | 39.97 oz (1,133 g) | $7.99 | 1 |
| 2920199 | Organic Blueberries | Twin River | 17.99 oz (510 g) | $12.99 | 1 |
| 1845137 | Organic Blueberries | Not recorded | 17.99 oz (510 g) | $12.99 | 1 |
| 3909559 | Organic Whole Milk | Simply Nature | 59.17 fl oz (1.75 L) | $5.19 | 1 |
| 1748979 | 1% Low-Fat Milk | Bowl & Basket | 63.98 fl oz (1.89 L) | $2.49 | 2 |
| 160541 | Organic Fat-Free Milk | Horizon Organic | 63.91 fl oz (1.89 L) | $8.24 | 2 |
| 171718 | Whole Ultra-Filtered Milk | fairlife | 51.97 fl oz (1.54 L) | $5.39 | 1 |
| 25284 | Almond Milk | Silk | 63.98 fl oz (1.89 L) | $4.99 | 1 |
| 1203745 | Reduced-Fat Milk | Stonyfield Organic | 63.91 fl oz (1.89 L) | $7.49 | 1 |
| 2651380 | Whole Milk | Organic Valley | 63.91 fl oz (1.89 L) | $9.99 | 1 |
| 56778 | Unsweetened Original Almond Milk | Almond Breeze | 31.99 fl oz (946 mL) | $2.29 | 3 |
| 1488577 | 2% Reduced-Fat Milk | KIRKLAND Signature | 127.99 fl oz (3.79 L) | $7.37 | 4 |
| 1770888 | Organic 2% Reduced-Fat Milk | Trader Joe's | 63.98 fl oz (1.89 L) | $3.99 | 7 |
| 1696385 | Fat-Free Milk | Kirkland | 127.99 fl oz (3.79 L) | $6.69 | 1 |
| 20386 | Reduced-Fat Milk | Lucerne | 63.98 fl oz (1.89 L) | $3.99 | 1 |
| 56792 | Almond Milk | Blue Diamond | 63.91 fl oz (1.89 L) | $4.29 | 1 |
| 62017 | 1% Low-Fat Milk | Hood | 63.98 fl oz (1.89 L) | $2.59 | 1 |
| 112348 | 1% Low-Fat Milk | Market Pantry | 127.99 fl oz (3.79 L) | $2.99 | 1 |
| 1852419 | Seedtastic Seed Bread | Simply Nature | 26.98 oz (765 g) | $4.19 | 1 |
| 1822949 | Flour Tortillas | PUEBLO LINDO | 19.97 oz (566 g) | $2.09 | 1 |
| 1003404 | Whole Wheat Bread | Trader Joe's | 21.98 oz (623 g) | $2.49 | 1 |
| 71889 | The Big 16 Bread | Silver Hills | 21.69 oz (615 g) | $6.19 | 2 |
| 1077402 | Thin-Sliced Organic Sprouted Whole Grain Bread | Killer Bread | 20.49 oz (581 g) | $7.79 | 1 |
| 13638 | Thin-Sliced Organic Good Seed Bread | DAVE'S KILLER BREAD | 20.49 oz (581 g) | $7.14 | 2 |

## Products on hold

None of these entries is included in the draft. A hold is not a permanent rejection; confirm metadata or supply an explicitly approved price before reconsidering it.

| Source product ID | Source display name | Reason to hold |
| --- | --- | --- |
| 650080 | Fruit: Wyman’s Wild Blueberries | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 108607 | Mango Berry | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 2558431 | Organic Blueberries | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 2094258 | Organic Avocado bite-sized pieces | 50 g may be a serving rather than the full avocado package. |
| 2321416 | Organic Berry Medley | Verify whether the berry medley is fresh or frozen before assigning a category. |
| 3687815 | Organic banana | 283 g banana record may describe a different package or product; confirm identity and quantity. |
| 1903763 | Kiwifruit | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 24296 | Sliced Peaches | Confirm canned versus fresh peaches before categorizing. |
| 197245 | Merry Maraschino Cherries | Confirm processed cherries category and full jar size. |
| 45292 | Maraschino Cherries | 5 g appears to be a serving quantity; verify the full jar. |
| 1824393 | Bluberries | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 1683284 | Bananas | Brand is recorded as 'australia'; verify identity and brand provenance. |
| 82737 | Mandarin Oranges, Whole Segments in Light Syrup | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 40069 | Pineapple Slices | Confirm canned versus fresh pineapple before categorizing. |
| 40157 | mandarin oranges | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 4253717 | Fresh Young Coconut | 6,633 g may describe a case rather than a single coconut; confirm the sellable unit. |
| 4263266 | Fresh Strawberries | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 4318064 | Sweet Envy | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 3286983 | Protein Blend Wild Blueberry Crumble | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 3438894 | FULL FAT OATMILK | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 3882856 | Coconut Milk | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 117343 | Organic Valley 0% Milk | Milk is measured in grams; verify the actual package volume. |
| 1019070 | Full Fat Oatmilk | Oat milk is measured in grams; verify the actual package volume. |
| 51713 | Lactose Free Whole Milk | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 160543 | Organic 1% Lowfat Milk | 7,570 mL may be a multipack; verify package count and total volume. |
| 1249386 | Grassfed 2% | Milk is measured in grams; verify volume and milk-fat identity. |
| 117192 | Whole Milk | Milk is measured in grams; verify actual package volume. |
| 1512949 | Milk | Generic 'Milk' with Bakers Corner branding and 354 mL could be a pantry milk product; verify identity. |
| 13643 | Organic Whole Wheat Bread | 28 g appears to be a bread serving, not the full loaf. |
| 92135 | Cinnamon Toast | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |
| 3272905 | Flour Tortillas | No eligible non-discounted price suggestion; requires developer-set MANUAL_DEMO price or additional verified evidence. |

## Developer approval checklist

Before approving any subset:

- [ ] Confirm each product's identity, full package quantity, category, display name, brand, and proposed variant group.
- [ ] Review synonyms so searches do not conflate milk-fat levels, fresh/frozen forms, or different bread varieties.
- [ ] Review product safety and child visibility. There is no universal “child-safe” finding in this draft.
- [ ] Approve each demo price, especially the 42 suggestions with limited evidence.
- [ ] Accept category placeholders for now, or download and review the permitted licensed images, add matching local image metadata, and update `public/products/ATTRIBUTION.md`.
- [ ] Decide whether to seed this smaller four-category subset first or complete category coverage before seeding.

After explicit approval, copy **only the approved products** into `prisma/catalog/catalog.us.json`. Each accepted price needs `approved: true` and the actual approval time in `approvedAt` (ISO 8601, with timezone). Do not automatically set every entry to approved.

If approving at a later date, re-evaluate the 24-month observation window. For an observed basis, the stored amount, count, and date range must match the evidence at approval time. If the developer chooses a different price, use `MANUAL_DEMO` and set `observationCount`, `observedFrom`, and `observedTo` to null while preserving U.S. verification evidence.

## Commands after approval

The agent did not run tests, schema validation, seeding, migrations, or source requests. Existing schema tests can be run manually:

```bash
npx vitest run src/features/catalog/server/curated-schema.test.ts
```

Only after the reviewed seed file has approved entries:

```bash
npx prisma db seed --config prisma7.config.ts
```

The seed validates the entire input and local image assets before database writes. Restart the local app, or redeploy through the normal developer workflow, after successful seeding to clear catalog caches.
