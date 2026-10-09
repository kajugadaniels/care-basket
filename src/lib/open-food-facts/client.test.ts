// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createOpenFoodFactsClient } from "./client";

describe("Open Food Facts metadata", () => {
	it("requests only metadata fields and stays below ten reads per minute", async () => {
		let time = 0;
		const wait = vi.fn(async (ms: number) => { time += ms; });
		const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ status: 1, product: { code: "012345678905", product_name: "Example Rice", categories_tags: ["en:rices"], owner: "private" } }));
		const client = createOpenFoodFactsClient({ userAgent: "CareBasket/0.1.0 (tests@example.com)", fetcher, now: () => time, wait });
		const result = await client.product("012345678905");
		await client.product("012345678905");
		expect(result).not.toHaveProperty("owner");
		expect(String(fetcher.mock.calls[0][0])).toContain("fields=");
		expect(wait).toHaveBeenCalledWith(6000, undefined);
	});
	it("returns null for a missing product and rejects a different barcode", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ status: 0 }))
			.mockResolvedValueOnce(Response.json({ status: 1, product: { code: "0000000000000" } }));
		const client = createOpenFoodFactsClient({ userAgent: "CareBasket/0.1.0 (tests@example.com)", fetcher, wait: async () => undefined });
		expect(await client.product("012345678905")).toBeNull();
		await expect(client.product("012345678905")).rejects.toMatchObject({ reason: "INVALID_RESPONSE" });
	});
});
