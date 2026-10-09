// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createCatalogHttpClient, retryAfterMilliseconds } from "./client";

describe("bounded catalog HTTP transport", () => {
	it("parses delta and HTTP-date Retry-After values without negative waits", () => {
		const now = Date.parse("2026-10-09T12:00:00Z");
		expect(retryAfterMilliseconds("5", now)).toBe(5000);
		expect(retryAfterMilliseconds("Fri, 09 Oct 2026 12:00:05 GMT", now)).toBe(5000);
		expect(retryAfterMilliseconds("Fri, 09 Oct 2026 11:00:00 GMT", now)).toBe(0);
		expect(retryAfterMilliseconds("invalid", now)).toBe(0);
	});
	it("rejects another host without fetching", async () => {
		const fetcher = vi.fn<typeof fetch>();
		const client = createCatalogHttpClient({ host: "prices.openfoodfacts.org", userAgent: "CareBasket/0.1.0 (tests@example.com)", intervalMs: 1000, fetcher, wait: async () => undefined });
		await expect(client.get("https://evil.example/api")).rejects.toMatchObject({ reason: "INVALID_RESPONSE" });
		expect(fetcher).not.toHaveBeenCalled();
	});
	it("bounds declared and streamed response sizes", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response("{}", { headers: { "content-length": "3000000" } }))
			.mockResolvedValueOnce(new Response(" ".repeat(2 * 1024 * 1024 + 1)));
		const client = createCatalogHttpClient({ host: "prices.openfoodfacts.org", userAgent: "CareBasket/0.1.0 (tests@example.com)", intervalMs: 1000, fetcher, wait: async () => undefined });
		await expect(client.get("/api/v1/prices")).rejects.toMatchObject({ reason: "INVALID_RESPONSE" });
		await expect(client.get("/api/v1/prices")).rejects.toMatchObject({ reason: "INVALID_RESPONSE" });
	});
	it("rejects malformed JSON without retrying a successful HTTP response", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("not json"));
		const client = createCatalogHttpClient({ host: "prices.openfoodfacts.org", userAgent: "CareBasket/0.1.0 (tests@example.com)", intervalMs: 1000, fetcher, wait: async () => undefined });
		await expect(client.get("/api/v1/prices")).rejects.toMatchObject({ reason: "INVALID_RESPONSE" });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
});
