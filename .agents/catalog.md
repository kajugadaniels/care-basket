# Product Catalog, Open Prices Integration, and Demo Pricing

**Purpose:** The authoritative specification for where CareBasket's products come from, how U.S. price observations are verified, how source data becomes the curated catalog, how checkout prices differ from observed prices, and what licensing obligations apply.
**Applies to:** Catalog models, the catalog importer and refresh scripts, product images, demo prices, data attribution, and anything that reads product or price data.
**Related:** [database.md § 5](database.md#5-planned-models), [ai.md § 6](ai.md#6-catalog-grounding-and-matching), [payments.md § 4](payments.md#4-money-handling), [privacy.md](privacy.md), [security.md § 7](security.md#7-input-validation)
**Last reviewed:** 2026-10-08

---

## 1. Market defaults

| Setting | Value |
| --- | --- |
| Country | United States (`US`) |
| Currency | USD, stored as integer cents |
| Language | English (`en-US`) |
| Initial catalog | Grocery and household essentials, about 100–150 curated products |
| Merchant | **CareBasket Demo Market**, a simulated U.S. grocery store. It does not exist, sells nothing, and ships nothing. |

These defaults live in one server-side config module (`src/features/catalog/config.ts`), never scattered as literals.

## 2. Sources and verification

| Source | URL | Role | Checked |
| --- | --- | --- | --- |
| Open Prices API (OpenAPI schema) | https://prices.openfoodfacts.org/api/docs and `/api/schema` | Primary source for products and price observations | 2026-10-08 |
| Open Prices repository and data guide | https://github.com/openfoodfacts/open-prices (`API.md`, `docs/guides/data.md`) | Data license (ODbL), daily exports | 2026-10-08 |
| Open Food Facts terms of use | https://world.openfoodfacts.org/terms-of-use | Database, content, and image licenses | 2026-10-08 |
| Open Food Facts API docs | https://openfoodfacts.github.io/openfoodfacts-server/api/ | Secondary metadata adapter, rate limits, User-Agent | 2026-10-08 |

Re-check these before implementing the importer; record any change here.

## 3. Verified Open Prices API facts

Read from the live OpenAPI schema on 2026-10-08. Do not use parameters that are not listed here or in the current schema.

### 3.1 Endpoints used

| Endpoint | Used for | Relevant documented query parameters |
| --- | --- | --- |
| `GET /api/v1/prices` | Price observations (with nested `product` and `location`) | `currency`, `type` (`PRODUCT`, `CATEGORY`), `product_code`, `product_code__in`, `product__categories_tags__contains`, `product__source`, `duplicate_of__isnull`, `price_is_discounted`, `location_id`, `location_id__in`, `location__type` (`OSM`, `ONLINE`), `date__gte`, `date__lte`, `order_by`, `page`, `size` |
| `GET /api/v1/products` | Product metadata lookup | `code`, `source`, `categories_tags__contains`, `brands_tags__contains`, `product_name__like`, `price_count__gte`, `order_by`, `page`, `size` |
| `GET /api/v1/products/code/{code}` | Single product by barcode | — |
| `GET /api/v1/locations` | Location lookup | `type`, `osm_address_country__like` (country **name**, not code), `price_count__gte`, `page`, `size` |
| `GET /api/v1/locations/{id}` | Single location | — |
| `GET /api/v1/locations/osm/countries` | Country summary (`country_code_2`, `location_count`, `price_count`) | `page`, `size` |

### 3.2 Facts that shape the design

- **No country filter on products or prices.** Neither `/products` nor `/prices` accepts a country-code parameter. `/locations` only offers `osm_address_country__like`, a fuzzy match on the country *name*. Do not invent parameters such as `country=US`.
- **Each price embeds its location.** `PriceFull` includes `location` (a `Location` object) whose `osm_address_country_code` is **nullable**. This is the field used for U.S. verification (§5).
- **Price fields:** `price` (decimal number, nullable), `currency` (nullable), `price_per` (`UNIT`, `KILOGRAM`, or null), `price_is_discounted`, `price_without_discount`, `discount_type`, `date` (observation date, nullable), `type`, `product_code`, `duplicate_of`, plus contributor fields (`owner`, `owner_comment`, `proof`) that CareBasket **never stores**.
- **Product fields:** `id`, `code` (barcode), `source` (`off`, `obf`, `opf`, `opff`, or null), `product_name`, `brands`, `categories_tags`, `image_url`, `product_quantity`, `product_quantity_unit`, `quantity` (free text), `price_count`. Many fields are nullable.
- **Pagination:** responses are `{ items, page, pages, size, total }`. Allowed `order_by` values are not enumerated in the schema; `order_by=-date` returned newest-first in testing. The maximum page size is not documented; use `size=50`.
- **No documented rate limit** for Open Prices reads. Reads need no authentication (tokens are only needed for writes).
- **Exports:** daily gzipped JSONL dumps of prices, proofs, and locations, and a Parquet dataset on Hugging Face, are listed in the data guide. They are an alternative for bulk analysis, not needed for a 150-product catalog.

## 4. Data availability snapshot

A small manual sample on 2026-10-08 (about ten read-only requests; **not** an import):

| Measure | Result |
| --- | --- |
| U.S. totals from `/locations/osm/countries` | about 380 locations, about 40,500 price observations |
| `currency=USD&type=PRODUCT` observations | 39,333 total; in a 100-item sample, all had `location.osm_address_country_code = "US"` |
| Completeness in that U.S. sample | product name 84%, `image_url` 76%, `product_quantity` 41%; nested `categories_tags` mostly empty |
| USD observations by category tag | breads 553, milks 287, eggs 239, rices 215, bananas 15 |
| USD observations by non-food source | Open Beauty Facts (`obf`) 39, Open Products Facts (`opf`) 41 |

**Gap:** branded food staples are well covered. Household and personal-care essentials (soap, toilet paper, detergent) and loose produce are **sparse**. Plan for those to be **CareBasket-curated demo products** (`source = CAREBASKET_CURATED`), never attributed to Open Prices. Record the final split after curation.

## 5. Establishing U.S.-associated price observations

An Open Prices observation is **U.S.-verified** only when **all** of these hold. Otherwise it is excluded and never stored:

1. `type` is `PRODUCT` and `product_code` is non-empty. Category-only prices are not product observations.
2. `duplicate_of` is null.
3. `location` is present and `location.type` is `OSM`. Online locations have no physical country.
4. `location.osm_address_country_code`, trimmed and upper-cased, equals `US`. If the nested location lacks the field but `location_id` exists, fetch `GET /api/v1/locations/{id}` once per run (cached) and apply the same check.
5. `currency` equals `USD`.
6. `price` is a finite number greater than 0 and at most 500.
7. `price_per` is null or `UNIT`. Per-kilogram prices are excluded from per-package observations.
8. `date` is a valid date, not in the future.

Rules:

- `currency=USD` and other query filters only **narrow** requests. They never replace the per-record checks above.
- Never infer the country from currency, the `osm_address_country` name, coordinates, store brand, product origin, barcode prefix, or product `source`.
- Discounted observations (`price_is_discounted = true`) may be stored for reference but are excluded from demo-price derivation.
- Each stored observation keeps its source ID, observation date, location ID and country code, currency, and amount in cents.

## 6. Observed prices vs. demo merchant prices

| | Reference price observation | Demo merchant price |
| --- | --- | --- |
| Meaning | A crowdsourced report that someone saw this price at a U.S. store on a date | The price CareBasket Demo Market charges in the Sandbox checkout |
| Source | Open Prices, U.S.-verified (§5) | Approved by the developer in the curated catalog file |
| Used for checkout | **Never** | **Always**, and only this |
| Shown to | Family managers, labelled "Reference price (Open Prices, observed {date})" | Family managers, and requesters only as an estimated total against their own stated budget ([payments.md § 8](payments.md#8-user-facing-states)), always labelled "Demo price" |
| Model | `PriceObservation` | `DemoMerchantPrice` |

Deriving a demo price:

- **Open Prices products:** suggested demo price = the median of U.S.-verified, non-discounted observations from the last 24 months, rounded to the nearest cent. Record the basis (`OBSERVED_MEDIAN`), observation count, and date range. Prefer at least 3 observations; with 1–2, mark the basis `OBSERVED_LIMITED`.
- **CareBasket-curated products:** the developer sets a plausible price, with basis `MANUAL_DEMO`.
- A suggested price becomes the demo price only after the developer approves it in the curated catalog file (§8). Refresh jobs may **report** new suggestions; they never change approved prices automatically.

Rules:

- Historical observations are never presented as current, guaranteed, or store-specific prices.
- AI never sees or sets any price ([ai.md § 3](ai.md#3-what-ai-must-not-do)).
- The UI never suggests that CareBasket orders from, or matches prices of, a real retailer.

## 7. Normalization

Source-specific fields stay in source-specific adapter types (`src/lib/open-prices/types.ts`). Only the normalizer maps them into CareBasket models.

| CareBasket field | Derived from | Rule |
| --- | --- | --- |
| `sku` | CareBasket | Stable, readable key such as `milk-whole-half-gallon`. Never derived from a barcode alone. |
| `barcode` | `product.code` | Digits only, with a valid check digit. UPC-A (12 digits) is left-padded to GTIN-13; a GTIN-14 starting with `0` is reduced to GTIN-13; EAN-8 is kept. Unique when present. |
| `displayName` | `product_name` | Cleaned and human-curated: plain words, no promotional text, at most 60 characters. |
| `brand` | `brands` | First brand only, trimmed, or null. |
| `category` | `categories_tags` (Open Prices or Open Food Facts) | Mapped to the CareBasket taxonomy below; unmappable products are skipped. |
| `variantGroup` | CareBasket | Groups sizes of the same item (for example `milk-whole`), so the server can choose a size ([ai.md § 6](ai.md#6-catalog-grounding-and-matching)). |
| `netQuantity` + `netQuantityUnit` | `product_quantity` + `product_quantity_unit`, else parsed `quantity` | Stored in base units: grams, milliliters, or count. Products without a determinable quantity are skipped unless curated by hand. |
| `sizeLabel` | Derived | U.S. customary first, metric second, such as `64 fl oz (1.89 L)` |
| `synonyms` | CareBasket | Plain-language names people actually say ("2% milk", "loaf of bread") |
| `imagePath` + attribution | `image_url` | See §9 |
| Source references | `product.id`, `product.code`, `product.source` | Stored for provenance and deduplication |

**CareBasket taxonomy:** `PRODUCE`, `DAIRY_EGGS`, `BAKERY`, `PANTRY`, `BREAKFAST`, `MEAT_SEAFOOD`, `FROZEN`, `SNACKS`, `BEVERAGES`, `HOUSEHOLD`, `PERSONAL_CARE`.

**Excluded products:** alcohol, tobacco, nicotine, and cannabis; medicines, supplements, and medical devices; knives and weapons; concentrated hazardous chemicals (for example bleach, drain cleaner, detergent pods); anything that is age-restricted. These are never imported or curated.

**Skip rules:** skip a product when its name, a mappable category, a determinable quantity, or a valid barcode is missing, or when it fails exclusion rules. Log the skip reason with counts; never fill gaps with invented data.

## 8. Curation and import pipeline

Catalog data flows in one direction, and **every step is run manually by the developer**:

```
Open Prices API ──▶ discover script ──▶ candidates report (not committed)
                                             │  human review
                                             ▼
                         prisma/catalog/catalog.us.json  (committed, ODbL)
                                             │
                                             ▼
                         prisma/seed.ts  ──▶  Neon (CatalogProduct, DemoMerchantPrice)
Open Prices API ──▶ refresh script ──▶ PriceObservation rows + suggested-price report
```

1. **Discover** (`scripts/catalog/discover.ts`): for each CareBasket category, query `/api/v1/prices` with `currency=USD`, `type=PRODUCT`, `duplicate_of__isnull=true`, the mapped `product__categories_tags__contains`, `order_by=-date`, `size=50`, paging until enough candidates are found. Apply §5 and §7. Write a candidates report with counts, skip reasons, and suggested demo prices to a git-ignored directory.
2. **Curate:** the developer (an agent may draft) selects about 100–150 products, edits names, synonyms, variant groups, and categories, adds CareBasket-curated products for gaps, approves demo prices, and saves `prisma/catalog/catalog.us.json`. The file is the **stable fallback catalog** and the only seed input.
3. **Seed** (`prisma/seed.ts`): validates the file with Zod and upserts by `sku`. **No network access at seed time.** Running it twice changes nothing.
4. **Refresh** (`scripts/catalog/refresh-observations.ts`, optional): fetches observations for curated barcodes (`product_code__in`, small batches), applies §5, upserts `PriceObservation` by source price ID, records a `CatalogSyncRun`, and reports suggested demo-price changes for human approval.

Importer requirements (discover and refresh):

| Requirement | Rule |
| --- | --- |
| Pagination | Follow `page`/`pages`; stop at a configured maximum per category |
| Timeouts | 15 seconds per request via `AbortSignal.timeout` |
| Rate limiting | Sequential requests, at most 1 per second to Open Prices; at most 10 per minute to Open Food Facts |
| Retries | Up to 3 attempts on network errors, 429, and 5xx, with exponential backoff and jitter (1 s, 2 s, 4 s), honouring `Retry-After` |
| Identification | `User-Agent: CareBasket/<version> (<contact>)` from `CATALOG_USER_AGENT` |
| Validation | Every response parsed with Zod; malformed records skipped and counted |
| Deduplication | By Open Prices price ID for observations; by normalized barcode for products |
| Attribution | Source, source IDs, and license stored on every record |
| Country and currency | §5, per record |
| Incomplete data | Skipped with a reason (§7) |
| API unavailable | Abort cleanly with a clear message; the curated file and database remain unchanged and usable |
| Idempotency | Upserts by stable keys; re-runs produce the same state |
| Scope | Never download the full worldwide dataset; never call Open Prices or Open Food Facts during a shopping request or from any client component |

## 9. Images

- Use only the image referenced by the product's Open Food Facts record (`image_url`, hosted on `images.openfoodfacts.org`), in the 400-pixel display size.
- During curation, the developer downloads the chosen images into `public/products/<sku>.jpg` without editing them, and the curation file records the source URL, product page URL, license (`CC BY-SA 3.0`), and attribution ("Open Food Facts contributors").
- `public/products/ATTRIBUTION.md` lists every image with its source and license. It is generated from the curation file.
- Images are served from CareBasket's own domain through `next/image`. Browsers never load product images directly from third-party hosts ([privacy.md § 4](privacy.md#4-data-minimization-rules)).
- CareBasket-curated products without a licensed photo use a large category tile (Hugeicons icon on a soft surface). Never use images from retailer websites, search results, or stock sites without a verified license.
- Product photos show packaging that may carry third-party trademarks and copyrighted artwork. Use them only to identify the product in the app; never in CareBasket branding or marketing.

## 10. Licensing and attribution

| Material | License | Obligation for CareBasket |
| --- | --- | --- |
| Open Food Facts database | ODbL 1.0 | Attribute; a publicly used derivative database must be offered under ODbL |
| Open Prices data | ODbL ("comply with the OdBL licence, mentioning the source … avoid combining non free data") | Same as above |
| Individual database contents | DbCL 1.0 | Attribute |
| Product images | CC BY-SA 3.0 | Attribute with license and link; adaptations (including resizing) shared under the same license |
| Open Prices source code | AGPL-3.0 | Not used; CareBasket calls the API only |

Implications:

- **The curated catalog file is a derivative database.** `prisma/catalog/catalog.us.json` (including CareBasket's demo prices, names, and synonyms) is published in the public repository under **ODbL 1.0**, with a header naming the sources. Because the app publicly uses the catalog, the public file also satisfies the offer-the-database obligation; the app's data-sources page links to it.
- **Code stays under the project's code license.** Application code does not become ODbL or CC BY-SA. The repository documents three licensing scopes: code (project license), `prisma/catalog/**` (ODbL 1.0), `public/products/**` (CC BY-SA 3.0, see `ATTRIBUTION.md`).
- **No non-free data.** Never mix in prices, names, or images copied from retailer websites or other non-open sources.
- **Attribution placement:** an in-app "Data sources" page (`/data-sources`), a short line on manager product details ("Product data: Open Food Facts and Open Prices contributors, ODbL"), the README, and the Devpost description.
- **Contributor privacy:** contributor usernames, comments, and proof images (receipts and price-tag photos) are never stored, displayed, or redistributed.
- This is an engineering reading of the licenses, not legal advice. The open questions in §13 need the developer's judgment.

## 11. Secondary adapter: Open Food Facts

Use only to fill missing metadata (name, quantity, categories, image) for products that already have U.S.-verified observations.

- `GET https://world.openfoodfacts.org/api/v2/product/{code}` with a `fields` list, and only for curated candidates.
- Respect the documented limits (15 product reads per minute per IP; 10 searches per minute; exceeding them may lead to a ban) and the `AppName/Version (ContactEmail)` User-Agent rule. CareBasket uses at most 10 requests per minute.
- Lives in `src/lib/open-food-facts/`, server-only, separate from the Open Prices adapter.
- Never used to decide country or price.

## 12. Prohibited patterns

- Treating an observation as a checkout price, a current price, or a store's price
- Inferring U.S. association from anything other than the verified location country code (§5)
- Invented products, barcodes, prices, stores, or images attributed to Open Prices or Open Food Facts
- Calling Open Prices or Open Food Facts during a shopping request, from Server Components on page render, or from client code
- Fetching the full worldwide dataset
- Storing contributor usernames, comments, or proof images
- Hotlinking third-party images in the browser
- AI creating, editing, or pricing catalog records

## 13. Open questions

- Confirm that the project's code license, ODbL for `prisma/catalog/**`, and CC BY-SA 3.0 for `public/products/**` are acceptable together in the public repository.
- Confirm that the dataset is large enough after curation; if fewer than about 80 Open Prices-backed products pass §5 and §7, decide how many CareBasket-curated products to add.
- Confirm whether manager-facing reference prices (`PriceObservation`) are in the MVP or come after the core flow works.

## 14. Acceptance criteria

- [ ] Every stored observation passed all checks in §5; tests prove that non-U.S., online, null-country, non-USD, category, duplicate, per-kilogram, and future-dated records are rejected.
- [ ] Checkout uses `DemoMerchantPrice` only; no code path reads `PriceObservation` for totals.
- [ ] The curated file validates with Zod, seeds idempotently without network access, and carries ODbL attribution.
- [ ] Every image has a recorded source, license, and attribution, and is served from CareBasket's domain.
- [ ] Data sources and licenses are visible in the app, the README, and the submission.
