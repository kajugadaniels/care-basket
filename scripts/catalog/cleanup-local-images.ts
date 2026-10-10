import { lstat, mkdir, mkdtemp, open, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { loadScriptEnvironment } from "../../src/lib/env/scripts";
import { getCloudinaryCloudName } from "../../src/lib/env/server";
import { validateSeedCatalog } from "../../src/features/catalog/server/curated-schema";
import { planLocalPhotoCleanup } from "../../src/features/catalog/server/image-assets";
import { renderImageAttribution } from "../../src/features/catalog/server/image-curation";

async function main() {
	const args = parseArgs({ options: { apply: { type: "boolean" }, "display-verified": { type: "boolean" } } });
	const options = z.strictObject({
		apply: z.boolean().default(false), "display-verified": z.boolean().default(false),
	}).parse(args.values);
	if (options.apply && !options["display-verified"]) {
		console.error("Before cleanup, verify Cloudinary photos display in the seeded app. Then use --apply --display-verified.");
		process.exitCode = 1;
		return;
	}
	loadScriptEnvironment();
	const catalogPath = resolve("prisma/catalog/catalog.us.json");
	const info = await lstat(catalogPath);
	if (!info.isFile() || info.isSymbolicLink() || info.size > 10 * 1024 * 1024) throw new Error("Invalid catalog input.");
	const original = await readFile(catalogPath, "utf8");
	const catalog = validateSeedCatalog(JSON.parse(original) as unknown);
	const cloudName = getCloudinaryCloudName();
	const entries = await planLocalPhotoCleanup(catalog, cloudName);
	console.info(`${entries.length} matching uploaded photos can leave public/products. Unmapped files and ATTRIBUTION.md are preserved.`);
	for (const entry of entries) console.info(entry.sku);
	if (!options.apply) {
		console.info("Preview only. No files, catalog records, database rows or Cloudinary assets changed.");
		return;
	}
	const output = resolve(".catalog-output");
	await mkdir(output, { recursive: true });
	if (await realpath(output) !== output) throw new Error("Invalid backup directory.");
	// Share the uploader's lock so cleanup cannot race an upload run.
	const lockPath = resolve(output, "cloudinary-upload.lock");
	const lock = await open(lockPath, "wx", 0o600);
	try {
		if (await readFile(catalogPath, "utf8") !== original) throw new Error("Catalog changed during cleanup.");
		const backup = await mkdtemp(resolve(output, "product-images-backup-"));
		console.info(`Recoverable backup: ${backup}`);
		const attributionPath = resolve("public/products/ATTRIBUTION.md");
		const attributionInfo = await lstat(attributionPath);
		if (!attributionInfo.isFile() || attributionInfo.isSymbolicLink() || attributionInfo.size > 1024 * 1024) throw new Error("Invalid attribution file.");
		await writeFile(resolve(backup, "ATTRIBUTION.md"), await readFile(attributionPath), { flag: "wx", mode: 0o600 });
		await writeFile(resolve(backup, "manifest.json"), JSON.stringify({
			version: 1, cloudName, files: entries.map((entry) => ({ sku: entry.sku, filename: basename(entry.path), sha256: entry.sha256 })),
		}, null, "\t") + "\n", { flag: "wx", mode: 0o600 });
		// Publish non-local attribution before moving photos; never leave dangling local links.
		const temporary = `${attributionPath}.${process.pid}.tmp`;
		const handle = await open(temporary, "wx", 0o600);
		try {
			await handle.writeFile(renderImageAttribution(catalog));
			await handle.sync();
			await rename(temporary, attributionPath);
		} finally {
			await handle.close();
			await unlink(temporary).catch(() => undefined);
		}
		let moved = 0;
		for (const entry of entries) {
			if (await readFile(catalogPath, "utf8") !== original) throw new Error("Catalog changed during cleanup.");
			const product = catalog.products.find((product) => product.sku === entry.sku);
			if (!product) throw new Error("Missing product during cleanup.");
			const current = await planLocalPhotoCleanup({ ...catalog, products: [product] }, cloudName);
			if (!current.some((photo) => photo.path === entry.path && photo.sha256 === entry.sha256)) throw new Error("Photo changed during cleanup.");
			await rename(entry.path, resolve(backup, basename(entry.path)));
			moved += 1;
		}
		console.info(`Moved ${moved} photos into the recoverable backup. Attribution retained. No catalog/database/Cloudinary mutations. Rerunning skips absent copies.`);
	} finally {
		await lock.close();
		await unlink(lockPath);
	}
}

main().catch(() => {
	console.error("Cleanup stopped. Check the cloud configuration, photo hashes, catalog consistency, attribution file and migration lock. Earlier photos may have moved into the printed backup; they remain recoverable. No database or Cloudinary changes.");
	process.exitCode = 1;
});
