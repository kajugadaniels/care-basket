// Synthetic test records only; never seed or attribute these to a real source contributor.
import type { OpenPricesObservation, OpenPricesProduct } from "@/lib/open-prices/types";
import type { CuratedCatalog } from "@/features/catalog/server/curated-schema";

export const TEST_TODAY = "2026-10-09";

export function makeSourceProduct(overrides: Partial<OpenPricesProduct> = {}): OpenPricesProduct {
	return {
		id: 9001, code: "012345678905", source: "off", product_name: "Example Rice", brands: "Example",
		categories_tags: ["en:rices"], product_quantity: 500, product_quantity_unit: "g",
		quantity: "500 g", image_url: null, price_count: 3, ...overrides,
	};
}

export function makeSourceObservation(overrides: Partial<OpenPricesObservation> = {}): OpenPricesObservation {
	return {
		id: 8001, type: "PRODUCT", product_code: "012345678905", product: makeSourceProduct(),
		location_id: 7001, location: { id: 7001, type: "OSM", osm_address_country_code: "US" },
		duplicate_of: null, currency: "USD", price: 3.49, price_per: "UNIT",
		price_is_discounted: false, date: "2026-10-01", ...overrides,
	};
}

export function makeCuratedCatalog(): CuratedCatalog {
	return {
		version: 1, country: "US", currency: "USD", locale: "en-US", merchant: "CareBasket Demo Market",
		license: "ODbL 1.0", attribution: "Open Food Facts and Open Prices contributors; CareBasket curated demo data",
		products: [{
			sku: "example-demo-rice", barcode: null, displayName: "Example Rice", brand: null,
			category: "PANTRY", variantGroup: "rice", netQuantity: 500, netQuantityUnit: "GRAM",
			sizeLabel: "17.64 oz (500 g)", synonyms: ["rice"], image: null,
			source: "CAREBASKET_CURATED", sourceProductId: null, sourceProductCode: null, sourceSystem: null,
			sourceLicense: "ODbL 1.0", isActive: true, isChildSuitable: true,
			verification: [],
			demoPrice: { currency: "USD", priceMinor: 349, basis: "MANUAL_DEMO", observationCount: null,
				observedFrom: null, observedTo: null, approved: true, approvedAt: "2026-10-09T10:00:00Z" },
		}],
	};
}
