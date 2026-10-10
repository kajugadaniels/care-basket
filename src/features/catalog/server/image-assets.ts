import "server-only";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { cloudinaryImageUrl } from "@/lib/cloudinary/catalog-images";
import { MAX_PRODUCT_IMAGE_BYTES } from "@/lib/open-food-facts/image-download";
import { CatalogValidationError } from "./curated-schema";
import type { CuratedCatalog } from "./curated-schema";

type Product = CuratedCatalog["products"][number];

function assetError() {
	return new CatalogValidationError("Catalog photo validation failed. Check account mappings, local files and photo hashes; no database writes were made.");
}

function validateRemotePhoto(product: Product, cloudName: string | undefined) {
	const remote = product.image?.cloudinary;
	if (!remote || !cloudName || remote.cloudName !== cloudName) throw assetError();
	try { cloudinaryImageUrl(remote); } catch { throw assetError(); }
}

async function inspectLocalPhoto(product: Product, publicDirectory: string): Promise<string | null> {
	const image = product.image;
	if (!image || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.sku)) throw assetError();
	const extension = image.path.split(".").pop();
	if (!["jpg", "png", "webp"].includes(extension ?? "") || image.path !== `/products/${product.sku}.${extension}`) throw assetError();
	const directory = resolve(publicDirectory, "products");
	const path = resolve(directory, `${product.sku}.${extension}`);
	try {
		if (await realpath(directory) !== directory) throw assetError();
		const file = await lstat(path);
		if (!file.isFile() || file.isSymbolicLink() || file.size === 0 || file.size > MAX_PRODUCT_IMAGE_BYTES
			|| await realpath(path) !== path) throw assetError();
		return path;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
		throw assetError();
	}
}

// Offline preflight: remote mappings replace local-file requirements, not source validation.
export async function validateSeedImages(catalog: CuratedCatalog, cloudName: string | undefined, publicDirectory = resolve("public")) {
	for (const product of catalog.products) {
		if (!product.image) continue;
		if (product.image.cloudinary) {
			validateRemotePhoto(product, cloudName);
			continue;
		}
		if (!await inspectLocalPhoto(product, publicDirectory)) throw assetError();
	}
}

export type LocalPhotoCleanupEntry = { sku: string; path: string; sha256: string };

export async function planLocalPhotoCleanup(catalog: CuratedCatalog, cloudName: string | undefined, publicDirectory = resolve("public")) {
	await validateSeedImages(catalog, cloudName, publicDirectory);
	const entries: LocalPhotoCleanupEntry[] = [];
	for (const product of catalog.products) {
		const remote = product.image?.cloudinary;
		if (!remote) continue;
		const path = await inspectLocalPhoto(product, publicDirectory);
		if (!path) continue; // Already cleaned up; never fetch or recreate a remote photo.
		const bytes = await readFile(path);
		if (bytes.length > MAX_PRODUCT_IMAGE_BYTES || createHash("sha256").update(bytes).digest("hex") !== remote.sha256) throw assetError();
		entries.push({ sku: product.sku, path, sha256: remote.sha256 });
	}
	return entries;
}
