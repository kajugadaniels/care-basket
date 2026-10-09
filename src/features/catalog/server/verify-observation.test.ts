// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createObservationVerifier } from "./verify-observation";
import { makeSourceObservation, TEST_TODAY } from "@/test/factories/catalog";
import type { OpenPricesObservation } from "@/lib/open-prices/types";

describe("per-observation U.S. verification", () => {
	it("accepts physical U.S. locations and produces integer-cent, nonpersonal evidence", async () => {
		const verify = createObservationVerifier(vi.fn());
		expect(await verify(makeSourceObservation({ location: { id: 7001, type: "OSM", osm_address_country_code: " us " } }), TEST_TODAY))
			.toEqual({ ok: true, observation: { sourcePriceId: 8001, productCode: "012345678905", priceMinor: 349,
				currency: "USD", observedOn: "2026-10-01", isDiscounted: false, locationId: 7001, locationCountryCode: "US" } });
	});
	it.each<Partial<OpenPricesObservation>>([
		{ type: "CATEGORY" }, { product_code: null }, { duplicate_of: 99 }, { duplicate_of: undefined },
		{ location: { id: 7001, type: "OSM", osm_address_country_code: "CA" } },
		{ location: { id: 7001, type: "ONLINE", osm_address_country_code: "US" } },
		{ location: null, location_id: null }, { currency: "CAD" }, { price: null }, { price: 0 },
		{ price: -1 }, { price: 501 }, { price: Infinity }, { price: NaN },
		{ price_per: "KILOGRAM" }, { price_per: undefined }, { date: "2026-10-10" }, { date: "2026-02-30" }, { date: null },
	])("rejects ineligible observation %j", async (overrides) => {
		const verify = createObservationVerifier(vi.fn());
		expect((await verify(makeSourceObservation(overrides), TEST_TODAY)).ok).toBe(false);
	});
	it("looks up a missing country once per location and independently verifies the result", async () => {
		const lookup = vi.fn().mockResolvedValue({ id: 7001, type: "OSM", osm_address_country_code: "US" });
		const verify = createObservationVerifier(lookup);
		const input = makeSourceObservation({ location: { id: 7001, type: "OSM", osm_address_country_code: null } });
		expect((await verify(input, TEST_TODAY)).ok).toBe(true);
		expect((await verify({ ...input, id: 8002 }, TEST_TODAY)).ok).toBe(true);
		expect(lookup).toHaveBeenCalledTimes(1);
	});
	it("never infers country from USD or from a location name", async () => {
		const verify = createObservationVerifier(vi.fn().mockResolvedValue({ id: 7001, type: "OSM", osm_address_country_code: null }));
		expect((await verify(makeSourceObservation({ location: null }), TEST_TODAY)).ok).toBe(false);
	});
	it("retains discounted observations only as reference evidence", async () => {
		const verify = createObservationVerifier(vi.fn());
		expect(await verify(makeSourceObservation({ price_is_discounted: true, price_per: null }), TEST_TODAY)).toMatchObject({ ok: true, observation: { isDiscounted: true } });
	});
});
