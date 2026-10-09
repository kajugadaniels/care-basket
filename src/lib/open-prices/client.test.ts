// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createOpenPricesClient } from "./client";
import { makeSourceObservation } from "@/test/factories/catalog";

const page = (items: unknown[], number = 1, pages = 1) => ({ items, page: number, pages, size: 50, total: items.length });
function setup(fetcher: typeof fetch) {
	let now = 0;
	const wait = vi.fn(async (ms: number) => { now += ms; });
	return { client: createOpenPricesClient({ userAgent: "CareBasket/0.1.0 (tests@example.com)", fetcher, now: () => now, wait, random: () => 0 }), wait };
}

describe("Open Prices client", () => {
	it("uses documented filters, identification, abort signal and stripped responses", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(page([{ ...makeSourceObservation(), owner: "never-keep", proof: { receipt: "private" } }])));
		const { client } = setup(fetcher);
		const result = await client.prices({ page: 1, size: 50, categoryTag: "en:rices", dateFrom: "2024-10-09" });
		const [url, options] = fetcher.mock.calls[0];
		expect(String(url)).toContain("product__categories_tags__contains=en%3Arices");
		expect(String(url)).not.toContain("country=");
		expect(options?.headers).toMatchObject({ "User-Agent": "CareBasket/0.1.0 (tests@example.com)" });
		expect(options?.signal).toBeInstanceOf(AbortSignal);
		expect(options?.redirect).toBe("error");
		expect(result.items[0]).not.toHaveProperty("owner");
		expect(result.items[0]).not.toHaveProperty("proof");
	});
	it("counts malformed records without retaining raw contributor data", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(page([makeSourceObservation(), { id: "invalid", owner: "private" }])));
		const { client } = setup(fetcher);
		expect(await client.prices({ page: 1, size: 50 })).toMatchObject({ malformed: 1, items: [makeSourceObservation()] });
	});
	it("follows explicit pages and enforces sequential one-per-second requests", async () => {
		const fetcher = vi.fn<typeof fetch>()
			.mockResolvedValueOnce(Response.json(page([makeSourceObservation()], 1, 2)))
			.mockResolvedValueOnce(Response.json(page([], 2, 2)));
		const { client, wait } = setup(fetcher);
		const [first, second] = await Promise.all([client.prices({ page: 1, size: 50 }), client.prices({ page: 2, size: 50 })]);
		expect(first.pages).toBe(2);
		expect(second.page).toBe(2);
		expect(String(fetcher.mock.calls[1][0])).toContain("page=2");
		expect(wait).toHaveBeenCalledWith(1000, undefined);
	});
	it("rejects invalid envelopes or mismatched pages without retrying", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(page([], 2, 2)));
		const { client } = setup(fetcher);
		await expect(client.prices({ page: 1, size: 50 })).rejects.toMatchObject({ reason: "INVALID_RESPONSE" });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it("honors Retry-After on 429 before a successful retry", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 429, headers: { "Retry-After": "4" } }))
			.mockResolvedValueOnce(Response.json(page([])));
		const { client, wait } = setup(fetcher);
		await client.prices({ page: 1, size: 50 });
		expect(wait).toHaveBeenCalledWith(4000, undefined);
		expect(fetcher).toHaveBeenCalledTimes(2);
	});
	it.each([400, 401, 404])("does not retry HTTP %i", async (status) => {
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status }));
		const { client } = setup(fetcher);
		await expect(client.prices({ page: 1, size: 50 })).rejects.toMatchObject({ status });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it("stops after three transient HTTP failures", async () => {
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: 503 }));
		const { client } = setup(fetcher);
		await expect(client.prices({ page: 1, size: 50 })).rejects.toMatchObject({ status: 503 });
		expect(fetcher).toHaveBeenCalledTimes(3);
	});
	it("bounds network and timeout retries without exposing provider errors", async () => {
		const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new DOMException("sensitive endpoint", "TimeoutError"));
		const { client } = setup(fetcher);
		await expect(client.prices({ page: 1, size: 50 })).rejects.toMatchObject({ reason: "NETWORK" });
		expect(fetcher).toHaveBeenCalledTimes(3);
	});
	it("applies the documented fifteen-second timeout on every request", async () => {
		const timeout = vi.spyOn(AbortSignal, "timeout");
		try {
			const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(page([])));
			await setup(fetcher).client.prices({ page: 1, size: 50 });
			expect(timeout).toHaveBeenCalledWith(15_000);
		} finally { timeout.mockRestore(); }
	});
	it("does not call fetch when already cancelled", async () => {
		const fetcher = vi.fn<typeof fetch>();
		const { client } = setup(fetcher);
		await expect(client.prices({ page: 1, size: 50 }, AbortSignal.abort())).rejects.toMatchObject({ reason: "ABORTED" });
		expect(fetcher).not.toHaveBeenCalled();
	});
	it("aborts instead of ignoring a long rate-limit cooldown", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 429, headers: { "Retry-After": "600" } }));
		const { client } = setup(fetcher);
		await expect(client.prices({ page: 1, size: 50 })).rejects.toMatchObject({ status: 429 });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it("validates location IDs and single product metadata", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ id: 10, type: "OSM", osm_address_country_code: "US" }));
		const { client } = setup(fetcher);
		await expect(client.location(11)).rejects.toMatchObject({ reason: "INVALID_RESPONSE" });
		await expect(client.product("not-a-code")).rejects.toThrow();
	});
});
