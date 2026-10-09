import "server-only";
import type { OpenPricesLocation, OpenPricesObservation } from "@/lib/open-prices/types";
import { CATALOG_MARKET } from "../config";
import { decimalToMinor, isCalendarDate } from "./demo-prices";
import type { VerifiedObservation } from "./demo-prices";

export type VerificationResult = { ok: true; observation: VerifiedObservation } | { ok: false; reason: string };

export function createObservationVerifier(lookup: (id: number) => Promise<OpenPricesLocation>) {
	const locations = new Map<number, Promise<OpenPricesLocation>>();
	return async function verify(input: OpenPricesObservation, today: string): Promise<VerificationResult> {
		if (input.type !== "PRODUCT" || !input.product_code?.trim()) return { ok: false, reason: "not-product" };
		// Undefined is not evidence that this is an original observation.
		if (input.duplicate_of !== null) return { ok: false, reason: "duplicate-or-unknown" };
		let location = input.location;
		if (location?.type === "ONLINE") return { ok: false, reason: "online-location" };
		if (!location?.osm_address_country_code?.trim() && input.location_id) {
			let pending = locations.get(input.location_id);
			if (!pending) {
				pending = lookup(input.location_id);
				locations.set(input.location_id, pending);
			}
			location = await pending;
		}
		if (!location || location.type !== "OSM" || (input.location_id && location.id !== input.location_id)) {
			return { ok: false, reason: "invalid-location" };
		}
		if (location.osm_address_country_code?.trim().toUpperCase() !== CATALOG_MARKET.country) return { ok: false, reason: "not-us" };
		if (input.currency !== CATALOG_MARKET.currency) return { ok: false, reason: "not-usd" };
		if (input.price === null || !Number.isFinite(input.price) || input.price <= 0 || input.price > 500) return { ok: false, reason: "invalid-price" };
		const priceMinor = decimalToMinor(input.price);
		if (priceMinor === null) return { ok: false, reason: "invalid-price" };
		if (input.price_per !== null && input.price_per !== "UNIT") return { ok: false, reason: "not-unit-price" };
		if (!input.date || !isCalendarDate(input.date) || input.date > today) return { ok: false, reason: "invalid-date" };
		return {
			ok: true,
			observation: {
				sourcePriceId: input.id, productCode: input.product_code, priceMinor, currency: CATALOG_MARKET.currency,
				observedOn: input.date, isDiscounted: input.price_is_discounted, locationId: location.id,
				locationCountryCode: CATALOG_MARKET.country,
			},
		};
	};
}
