// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upsert: vi.fn().mockResolvedValue({ products: 1 }) }));
vi.mock("server-only", () => ({}));
vi.mock("./seed-repository", () => ({ upsertCuratedProducts: mocks.upsert }));
import { seedCatalog } from "./seed-service";
import { makeCuratedCatalog } from "@/test/factories/catalog";

describe("offline seed service", () => {
	beforeEach(() => { mocks.upsert.mockClear(); });
	it("validates the complete dataset before any write and never calls source APIs", async () => {
		const fetcher = vi.fn();
		vi.stubGlobal("fetch", fetcher);
		try {
			const catalog = makeCuratedCatalog();
			await expect(seedCatalog(catalog, new Date("2026-10-09T12:00:00Z"))).resolves.toEqual({ products: 1 });
			expect(mocks.upsert).toHaveBeenCalledWith(catalog);
			expect(fetcher).not.toHaveBeenCalled();
		} finally { vi.unstubAllGlobals(); }
	});
	it("performs no writes when even a later record is invalid", async () => {
		const catalog = makeCuratedCatalog();
		const raw = { ...catalog, products: [...catalog.products, { ...catalog.products[0], sku: "second-rice", demoPrice: { ...catalog.products[0].demoPrice, approved: false } }] };
		await expect(seedCatalog(raw)).rejects.toThrow(/validation/);
		expect(mocks.upsert).not.toHaveBeenCalled();
	});
});
