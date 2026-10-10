// @vitest-environment node
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { productPublicId } from "@/lib/cloudinary/catalog-images";
import { makeCuratedCatalog } from "@/test/factories/catalog";
import { planLocalPhotoCleanup, validateSeedImages } from "./image-assets";

const photo = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const sha256 = createHash("sha256").update(photo).digest("hex");

function fixture(remote = true) {
	const catalog = makeCuratedCatalog();
	const product = catalog.products[0];
	Object.assign(product, {
		source: "OPEN_PRICES", barcode: "0012345678905", sourceProductId: 9001,
		sourceProductCode: "012345678905", sourceSystem: "off",
		verification: [{ sourcePriceId: 8001, productCode: "012345678905", priceMinor: 349,
			currency: "USD", observedOn: "2026-10-01", isDiscounted: false, locationId: 7001, locationCountryCode: "US" }],
	});
	product.image = {
		path: `/products/${product.sku}.jpg`,
		sourceUrl: "https://images.openfoodfacts.org/images/products/001/234/567/8905/front_en.1.400.jpg",
		productUrl: "https://world.openfoodfacts.org/product/012345678905",
		license: "CC BY-SA 3.0", attribution: "Open Food Facts contributors",
		...(remote ? { cloudinary: { cloudName: "fixture-cloud", publicId: productPublicId(product.sku, sha256),
			sha256, version: 123, format: "jpg" as const } } : {}),
	};
	return catalog;
}

describe("offline photo validation and recoverable cleanup planning", () => {
	let directory: string;
	let path: string;
	beforeEach(async () => {
		directory = await realpath(await mkdtemp(join(tmpdir(), "carebasket-image-assets-")));
		await mkdir(join(directory, "products"));
		path = join(directory, "products", "example-demo-rice.jpg");
	});
	afterEach(async () => {
		vi.unstubAllGlobals();
		await rm(directory, { recursive: true, force: true });
	});
	it("seeds mapped photos without a local copy or any remote request", async () => {
		const fetcher = vi.fn();
		vi.stubGlobal("fetch", fetcher);
		await expect(validateSeedImages(fixture(), "fixture-cloud", directory)).resolves.toBeUndefined();
		expect(fetcher).not.toHaveBeenCalled();
	});
	it.each([undefined, "wrong-cloud"])("refuses missing or mismatched cloud configuration %s", async (cloud) => {
		await expect(validateSeedImages(fixture(), cloud, directory)).rejects.toThrow(/validation/);
		await expect(planLocalPhotoCleanup(fixture(), cloud, directory)).rejects.toThrow(/validation/);
	});
	it("still requires existing, bounded files for unmigrated photos", async () => {
		await expect(validateSeedImages(fixture(false), undefined, directory)).rejects.toThrow(/validation/);
		await writeFile(path, photo);
		await expect(validateSeedImages(fixture(false), undefined, directory)).resolves.toBeUndefined();
		for (const invalid of [Buffer.alloc(0), Buffer.alloc(2 * 1024 * 1024 + 1)]) {
			await writeFile(path, invalid);
			await expect(validateSeedImages(fixture(false), undefined, directory)).rejects.toThrow(/validation/);
		}
	});
	it("plans only byte-identical uploaded copies and changes no files", async () => {
		await writeFile(path, photo);
		await writeFile(join(directory, "products", "ATTRIBUTION.md"), "preserve attribution");
		await writeFile(join(directory, "products", "unrelated.jpg"), "preserve unrelated file");
		const catalog = fixture();
		const before = structuredClone(catalog);
		expect(await planLocalPhotoCleanup(catalog, "fixture-cloud", directory)).toEqual([
			{ sku: "example-demo-rice", path, sha256 },
		]);
		expect(await readFile(path)).toEqual(photo);
		expect(catalog).toEqual(before);
		expect(await readFile(join(directory, "products", "ATTRIBUTION.md"), "utf8")).toBe("preserve attribution");
	});
	it("skips absent migrated copies and preserves unmigrated copies", async () => {
		expect(await planLocalPhotoCleanup(fixture(), "fixture-cloud", directory)).toEqual([]);
		await writeFile(path, photo);
		expect(await planLocalPhotoCleanup(fixture(false), undefined, directory)).toEqual([]);
		expect(await readFile(path)).toEqual(photo);
	});
	it("refuses different bytes instead of moving an unverified local photo", async () => {
		await writeFile(path, "different photo");
		await expect(planLocalPhotoCleanup(fixture(), "fixture-cloud", directory)).rejects.toThrow(/validation/);
		expect(await readFile(path, "utf8")).toBe("different photo");
	});
	it("rejects symbolic links and paths outside the product directory", async () => {
		const elsewhere = join(directory, "elsewhere.jpg");
		await writeFile(elsewhere, photo);
		await symlink(elsewhere, path);
		await expect(planLocalPhotoCleanup(fixture(), "fixture-cloud", directory)).rejects.toThrow(/validation/);
		const catalog = fixture(false);
		if (!catalog.products[0].image) throw new Error("Expected image fixture.");
		catalog.products[0].image.path = "/products/../../elsewhere.jpg";
		await expect(validateSeedImages(catalog, undefined, directory)).rejects.toThrow(/validation/);
	});
});
