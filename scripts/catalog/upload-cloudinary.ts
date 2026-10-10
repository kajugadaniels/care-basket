import { lstat, mkdir, open, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { loadScriptEnvironment } from "../../src/lib/env/scripts";
import { getCloudinaryCloudName, getCloudinaryUploadEnv } from "../../src/lib/env/server";
import { cloudinaryImageUrl, productPublicId } from "../../src/lib/cloudinary/catalog-images";
import type { CloudinaryImage } from "../../src/lib/cloudinary/catalog-images";
import { CloudinaryUploadError, uploadProductImage, validateUploadImage } from "../../src/lib/cloudinary/upload";
import { MAX_PRODUCT_IMAGE_BYTES } from "../../src/lib/open-food-facts/image-download";
import { validateSeedCatalog } from "../../src/features/catalog/server/curated-schema";
import type { CuratedCatalog } from "../../src/features/catalog/server/curated-schema";

const catalogPath = resolve("prisma/catalog/catalog.us.json");

async function readCatalog() {
	const file = await lstat(catalogPath);
	if (!file.isFile() || file.isSymbolicLink() || file.size > 10 * 1024 * 1024) throw new Error("Invalid catalog file.");
	return readFile(catalogPath, "utf8");
}

async function readLocalImage(path: string) {
	const root = resolve("public/products");
	if (await realpath(root) !== root) throw new Error("Product directory must not be a symbolic link.");
	const absolute = resolve(`public${path}`);
	const file = await lstat(absolute);
	if (!file.isFile() || file.isSymbolicLink() || file.size === 0 || file.size > MAX_PRODUCT_IMAGE_BYTES) {
		throw new Error("A referenced local product photo is missing or invalid.");
	}
	if (await realpath(absolute) !== absolute) throw new Error("Product photo must not be a symbolic link.");
	return readFile(absolute);
}

async function checkpoint(contents: string, expected: string) {
	if (await readCatalog() !== expected) throw new Error("Catalog changed during upload. Stop other edits before rerunning.");
	const temporary = `${catalogPath}.${process.pid}.tmp`;
	const handle = await open(temporary, "wx", 0o600);
	try {
		await handle.writeFile(contents);
		await handle.sync();
		await rename(temporary, catalogPath);
	} finally {
		await handle.close();
		await unlink(temporary).catch(() => undefined);
	}
}

async function main() {
	const args = parseArgs({ options: { apply: { type: "boolean" }, sku: { type: "string" } } });
	const options = z.strictObject({
		apply: z.boolean().default(false),
		sku: z.string().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
	}).parse(args.values);
	loadScriptEnvironment();
	const cloudName = getCloudinaryCloudName();
	if (!cloudName) throw new Error("Set CLOUDINARY_CLOUD_NAME in the selected environment first.");
	let previous = await readCatalog();
	const catalog = validateSeedCatalog(JSON.parse(previous) as unknown);
	if (catalog.products.some((product) => product.image?.cloudinary && product.image.cloudinary.cloudName !== cloudName)) {
		throw new Error("Existing catalog images belong to another account.");
	}
	if (options.sku && !catalog.products.some((product) => product.sku === options.sku)) throw new Error("Unknown SKU.");
	const selected = catalog.products.filter((product) => !options.sku || product.sku === options.sku);
	if (options.sku && !selected[0]?.image) throw new Error("Selected SKU has no reviewed photo to upload.");
	const pending: { product: CuratedCatalog["products"][number]; format: CloudinaryImage["format"]; sha256: string }[] = [];
	// Preflight the entire selection before any upload. Keep only hashes, not all photos in memory.
	for (const product of selected) {
		if (!product.image) continue;
		const format = z.enum(["jpg", "png", "webp"]).parse(extname(product.image.path).slice(1));
		const remote = product.image.cloudinary;
		let bytes: Buffer;
		try {
			bytes = await readLocalImage(product.image.path);
		} catch (error) {
			// A previously uploaded copy may have been removed by approved cleanup.
			if (remote && error instanceof Error && "code" in error && error.code === "ENOENT") continue;
			throw error;
		}
		const sha256 = validateUploadImage(bytes, format);
		cloudinaryImageUrl({ cloudName, publicId: productPublicId(product.sku, sha256),
			format, sha256, version: Number.MAX_SAFE_INTEGER });
		if (remote) {
			if (remote.cloudName !== cloudName || remote.sha256 !== sha256) throw new Error("Existing Cloudinary mapping differs from the account or local photo. Review manually.");
			continue;
		}
		pending.push({ product, format, sha256 });
	}
	console.info(`${pending.length} reviewed photos ready for care-based/products; ${selected.filter((product) => !product.image).length} products have no reviewed photo.`);
	for (const entry of pending) console.info(entry.product.sku);
	if (!options.apply || !pending.length) {
		console.info("Preview/complete: no uploads or database writes. Use --apply after checking the account and photo list.");
		return;
	}
	const config = getCloudinaryUploadEnv();
	await mkdir(resolve(".catalog-output"), { recursive: true });
	const lockPath = resolve(".catalog-output/cloudinary-upload.lock");
	const lock = await open(lockPath, "wx", 0o600);
	try {
		const backup = resolve(`.catalog-output/catalog.before-cloudinary-${Date.now()}.json`);
		await writeFile(backup, previous, { flag: "wx", mode: 0o600 });
		console.info(`Catalog backup: ${backup}`);
		let uploaded = 0;
		for (const entry of pending) {
			await delay(1000);
			if (await readCatalog() !== previous) throw new Error("Catalog was edited during upload. Stop and review.");
			const image = entry.product.image;
			if (!image) throw new Error("Missing reviewed photo.");
			const bytes = await readLocalImage(image.path);
			if (validateUploadImage(bytes, entry.format) !== entry.sha256) throw new Error("Local photo changed during upload.");
			image.cloudinary = await uploadProductImage(entry.product.sku, bytes, entry.format, config);
			validateSeedCatalog(catalog);
			const next = JSON.stringify(catalog, null, "\t") + "\n";
			await checkpoint(next, previous);
			previous = next;
			uploaded += 1;
			console.info(`${entry.product.sku}: ${cloudinaryImageUrl(image.cloudinary)}`);
		}
		console.info(`Uploaded ${uploaded} photos. Local files, licenses and prices retained. No database writes. Seed, then restart/rebuild to display Cloudinary photos.`);
	} finally {
		await lock.close();
		await unlink(lockPath);
	}
}

main().catch((error: unknown) => {
	if (error instanceof CloudinaryUploadError) console.error(error.message);
	else console.error("Cloudinary migration stopped. Check CLI options, CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET/FOLDER_MODE, local photos, catalog consistency and .catalog-output/cloudinary-upload.lock.");
	console.error("Saved mappings remain; no database writes or local deletions. An upload without a saved mapping may need manual Cloudinary review before retrying. Never run two migrations concurrently.");
	process.exitCode = 1;
});
