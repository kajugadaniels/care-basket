import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import { z } from "zod";
import { loadScriptEnvironment } from "../../src/lib/env/scripts";
import { getCatalogEnv } from "../../src/lib/env/server";
import { downloadProductImage, MAX_PRODUCT_IMAGE_BYTES, ProductImageError } from "../../src/lib/open-food-facts/image-download";
import { validateSeedCatalog } from "../../src/features/catalog/server/curated-schema";
import { planCatalogImages, renderImageAttribution } from "../../src/features/catalog/server/image-curation";

async function readBounded(path: string, maximum: number): Promise<string> {
	const file = await stat(path);
	if (!file.isFile() || file.size > maximum) throw new Error("Input file exceeds its size limit.");
	return readFile(path, "utf8");
}

async function replaceFile(path: string, contents: string) {
	const temporary = `${path}.${process.pid}.tmp`;
	try {
		await writeFile(temporary, contents, { flag: "wx" });
		await rename(temporary, path);
	} finally {
		await unlink(temporary).catch(() => undefined);
	}
}

async function main() {
	const args = parseArgs({ options: { apply: { type: "boolean" }, sku: { type: "string" } } });
	const options = z.strictObject({
		apply: z.boolean().default(false),
		sku: z.string().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
	}).parse(args.values);
	const catalogPath = resolve("prisma/catalog/catalog.us.json");
	const original = await readBounded(catalogPath, 10 * 1024 * 1024);
	const catalog = validateSeedCatalog(JSON.parse(original) as unknown);
	const report = JSON.parse(await readBounded(resolve(".catalog-output/candidates.us.json"), 10 * 1024 * 1024)) as unknown;
	if (options.sku && !catalog.products.some((product) => product.sku === options.sku)) {
		throw new Error("Unknown catalog SKU.");
	}
	const plan = planCatalogImages(catalog, report).filter((entry) => !options.sku || entry.sku === options.sku);
	for (const entry of plan) console.info(`${entry.sku}\n  ${entry.image.sourceUrl}\n  ${entry.image.productUrl}`);
	console.info(`${plan.length} matching photos available; ${catalog.products.filter((product) => !product.image).length} products currently have no photo.`);
	if (!options.apply) {
		console.info("Preview only. Review the product photos and license, then rerun with --apply (optionally --sku <sku>). No files or database rows changed.");
		return;
	}
	loadScriptEnvironment();
	const { CATALOG_USER_AGENT: userAgent } = getCatalogEnv();
	await mkdir(resolve("public/products"), { recursive: true });
	await mkdir(resolve(".catalog-output"), { recursive: true });
	let imported = 0;
	let failed = 0;
	for (const entry of plan) {
		await delay(1000);
		let bytes: Buffer;
		try {
			bytes = await downloadProductImage(entry.image.sourceUrl, userAgent);
		} catch (error) {
			if (!(error instanceof ProductImageError)) throw error;
			console.warn(`${entry.sku}: ${error.message} Kept the category placeholder.`);
			failed += 1;
			continue;
		}
		const path = resolve(`public${entry.image.path}`);
		try {
			await writeFile(path, bytes, { flag: "wx" });
		} catch (error) {
			if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
			const file = await stat(path);
			if (!file.isFile() || file.size > MAX_PRODUCT_IMAGE_BYTES || !(await readFile(path)).equals(bytes)) {
				throw new Error("An existing photo differs from its source. Review it manually; no existing photos were overwritten.");
			}
		}
		const product = catalog.products.find((product) => product.sku === entry.sku);
		if (!product) throw new Error("Catalog changed unexpectedly.");
		product.image = entry.image;
		imported += 1;
	}
	validateSeedCatalog(catalog);
	// Verify all referenced assets, including previously curated photos, before publishing attribution.
	for (const product of catalog.products) {
		if (!product.image) continue;
		const file = await stat(resolve(`public${product.image.path}`));
		if (!file.isFile() || file.size === 0 || file.size > MAX_PRODUCT_IMAGE_BYTES) throw new Error("A referenced local photo is missing or invalid.");
	}
	if (await readBounded(catalogPath, 10 * 1024 * 1024) !== original) {
		throw new Error("Catalog was edited during import; rerun after reviewing the changes.");
	}
	if (imported > 0) {
		const backup = resolve(`.catalog-output/catalog.before-images-${Date.now()}.json`);
		await writeFile(backup, original, { flag: "wx" });
		await replaceFile(catalogPath, JSON.stringify(catalog, null, "\t") + "\n");
		console.info(`Catalog backup: ${backup}`);
	}
	await replaceFile(resolve("public/products/ATTRIBUTION.md"), renderImageAttribution(catalog));
	console.info(`Imported ${imported} photos; ${failed} downloads failed. No database writes or price/safety changes. Seed the catalog and restart/redeploy the app to display the photos.`);
	if (failed > 0) process.exitCode = 1;
}

main().catch(() => {
	console.error("Image import stopped. Check CLI options, CATALOG_USER_AGENT, matching report, source availability, and local files. No database writes were made. Downloaded photos may remain; rerunning is safe. Existing photos were not overwritten.");
	process.exitCode = 1;
});
