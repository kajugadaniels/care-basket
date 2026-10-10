// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ upsert: vi.fn().mockResolvedValue({ products: 1 }), cloudName: vi.fn(() => "fixture-cloud" as string | undefined) }));
vi.mock("server-only", () => ({}));
vi.mock("./seed-repository", () => ({ upsertCuratedProducts: mocks.upsert }));
vi.mock("@/lib/env/server", () => ({ getCloudinaryCloudName: mocks.cloudName }));
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { productPublicId } from "@/lib/cloudinary/catalog-images";
import { validateSeedCatalog } from "./curated-schema";
import { seedCatalog } from "./seed-service";
import { makeCuratedCatalog } from "@/test/factories/catalog";

describe("offline seed service", () => {
	beforeEach(() => { mocks.upsert.mockClear(); mocks.cloudName.mockReturnValue("fixture-cloud"); });
	it("requires every uploaded photo to belong to the configured cloud before any write", async () => {
		const now = new Date("2026-10-10T23:59:59Z");
		const catalog = validateSeedCatalog(JSON.parse(readFileSync(resolve("prisma/catalog/catalog.us.json"), "utf8")) as unknown, now);
		const product = catalog.products.find((entry) => entry.image?.path.endsWith(".jpg"));
		if (!product?.image) throw new Error("Expected a reviewed local photo.");
		// Isolate this fixture from real account mappings created by manual migration.
		catalog.products = [product];
		const sha256 = "a".repeat(64);
		product.image.cloudinary = { cloudName: "fixture-cloud", publicId: productPublicId(product.sku, sha256),
			sha256, version: 123, format: "jpg" };
		for (const cloud of [undefined, "wrong-cloud"]) {
			mocks.cloudName.mockReturnValue(cloud);
			await expect(seedCatalog(catalog, now)).rejects.toThrow(/CLOUDINARY_CLOUD_NAME/);
			expect(mocks.upsert).not.toHaveBeenCalled();
		}
		mocks.cloudName.mockReturnValue("fixture-cloud");
		await seedCatalog(catalog, now);
		expect(mocks.upsert).toHaveBeenCalledWith(catalog);
	});
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
