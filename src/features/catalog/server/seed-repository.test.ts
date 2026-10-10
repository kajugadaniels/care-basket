// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

type ProductWrite = { where: { sku: string }; create: Record<string, unknown>; update: Record<string, unknown> };
type PriceWrite = { where: { productId_currency: { productId: string; currency: string } }; create: Record<string, unknown>; update: Record<string, unknown> };
type TransactionOptions = { maxWait: number; timeout: number };
type Transaction = (callback: (tx: unknown) => Promise<void>, options: TransactionOptions) => Promise<void>;
const fake = vi.hoisted(() => {
	const products = new Map<string, Record<string, unknown>>();
	const prices = new Map<string, Record<string, unknown>>();
	const productUpserts = vi.fn();
	const priceUpserts = vi.fn();
	const state = { failPrice: false };
	const transaction = vi.fn<Transaction>(async (callback) => {
		const stagedProducts = new Map(products);
		const stagedPrices = new Map(prices);
		await callback({
			catalogProduct: {
				findUnique: async ({ where }: { where: { sku: string } }) => stagedProducts.get(where.sku) ?? null,
				upsert: async (input: ProductWrite) => {
					productUpserts(input);
					const previous = stagedProducts.get(input.where.sku);
					const value = previous ? { ...previous, ...input.update } : { id: `product-${stagedProducts.size}`, ...input.create };
					stagedProducts.set(input.where.sku, value);
					return { id: value.id };
				},
			},
			demoMerchantPrice: {
				findUnique: async ({ where }: { where: PriceWrite["where"] }) => stagedPrices.get(where.productId_currency.productId) ?? null,
				upsert: async (input: PriceWrite) => {
					priceUpserts(input);
					if (state.failPrice) throw new Error("price write unavailable");
					const key = input.where.productId_currency.productId;
					const previous = stagedPrices.get(key);
					stagedPrices.set(key, previous ? { ...previous, ...input.update } : input.create);
					return { id: "price" };
				},
			},
		});
		products.clear(); prices.clear();
		for (const [key, value] of stagedProducts) products.set(key, value);
		for (const [key, value] of stagedPrices) prices.set(key, value);
	});
	return { products, prices, productUpserts, priceUpserts, state, db: { $transaction: transaction } };
});
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => fake.db }));
import { upsertCuratedProducts } from "./seed-repository";
import { makeCuratedCatalog } from "@/test/factories/catalog";
import { cloudinaryImageUrl, productPublicId } from "@/lib/cloudinary/catalog-images";

describe("idempotent catalog writes", () => {
	beforeEach(() => {
		fake.products.clear(); fake.prices.clear(); fake.productUpserts.mockClear(); fake.priceUpserts.mockClear(); fake.state.failPrice = false;
		fake.db.$transaction.mockClear();
	});
	it("writes Cloudinary delivery URLs while retaining original photo provenance and prices", async () => {
		const catalog = makeCuratedCatalog();
		const product = catalog.products[0];
		const sha256 = "a".repeat(64);
		const remote = { cloudName: "fixture-cloud", publicId: productPublicId(product.sku, sha256), sha256, version: 123, format: "jpg" as const };
		// Repository mapping test; complete source validation belongs to the seed service.
		product.image = {
			path: `/products/${product.sku}.jpg`, sourceUrl: "https://images.openfoodfacts.org/images/products/001/234/567/8905/front_en.1.400.jpg",
			productUrl: "https://world.openfoodfacts.org/product/012345678905",
			license: "CC BY-SA 3.0", attribution: "Open Food Facts contributors", cloudinary: remote,
		};
		await upsertCuratedProducts(catalog);
		expect(fake.productUpserts.mock.calls[0][0].create).toMatchObject({
			imagePath: cloudinaryImageUrl(remote), imageSourceUrl: product.image.sourceUrl,
			imageProductUrl: product.image.productUrl, imageLicense: product.image.license, imageAttribution: product.image.attribution,
		});
		expect(fake.priceUpserts.mock.calls[0][0].create.priceMinor).toBe(349);
		expect(fake.productUpserts.mock.calls[0][0].create).not.toHaveProperty("cloudinary");
	});
	it("uses bounded seed-only transaction budgets for each product", async () => {
		const catalog = makeCuratedCatalog();
		catalog.products.push({ ...catalog.products[0], sku: "another-demo-rice" });

		await upsertCuratedProducts(catalog);

		expect(fake.db.$transaction).toHaveBeenCalledTimes(2);
		for (const [, options] of fake.db.$transaction.mock.calls) {
			expect(options).toEqual({ maxWait: 15_000, timeout: 30_000 });
		}
		expect(fake.products.size).toBe(2);
		expect(fake.prices.size).toBe(2);
	});
	it("upserts by SKU and price composite key without changing repeated seed state", async () => {
		const catalog = makeCuratedCatalog();
		await upsertCuratedProducts(catalog);
		await upsertCuratedProducts(catalog);
		expect(fake.products.size).toBe(1);
		expect(fake.prices.size).toBe(1);
		expect(fake.productUpserts.mock.calls[1][0]).toMatchObject({ where: { sku: "example-demo-rice" }, update: {} });
		expect(fake.priceUpserts.mock.calls[1][0]).toMatchObject({ where: { productId_currency: { currency: "USD" } }, update: {} });
	});
	it("preserves unrelated existing products and never deletes absent seed entries", async () => {
		fake.products.set("unrelated", { id: "old-product", sku: "unrelated", archivedAt: new Date("2026-01-01Z") });
		await upsertCuratedProducts(makeCuratedCatalog());
		expect(fake.products.get("unrelated")).toHaveProperty("id", "old-product");
		expect(fake.products.size).toBe(2);
	});
	it("rolls back the product when its approved price write fails", async () => {
		fake.state.failPrice = true;
		await expect(upsertCuratedProducts(makeCuratedCatalog())).rejects.toThrow();
		expect(fake.products.size).toBe(0);
		expect(fake.prices.size).toBe(0);
	});
});
