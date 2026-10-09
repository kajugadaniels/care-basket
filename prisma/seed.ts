import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { loadScriptEnvironment } from "../src/lib/env/scripts";
import { CatalogValidationError, validateSeedCatalog } from "../src/features/catalog/server/curated-schema";
import { seedCatalog } from "../src/features/catalog/server/seed-service";
import { closeSeedConnection } from "../src/features/catalog/server/seed-repository";

let seedStarted = false;

async function main() {
	loadScriptEnvironment();
	const raw: unknown = JSON.parse(await readFile(resolve("prisma/catalog/catalog.us.json"), "utf8"));
	const catalog = validateSeedCatalog(raw);
	// Validate every referenced local asset before making any database writes.
	for (const product of catalog.products) {
		if (!product.image) continue;
		const file = await stat(resolve(`public${product.image.path}`));
		if (!file.isFile() || file.size > 2 * 1024 * 1024 || file.size === 0) {
			throw new Error("A curated product image is missing or exceeds 2 MB; no writes were made.");
		}
	}
	seedStarted = true;
	const result = await seedCatalog(catalog);
	console.info(`Seeded ${result.products} reviewed products. No products were deleted. Restart/redeploy the app after seeding to invalidate the catalog cache.`);
}

main().catch((error: unknown) => {
	console.error(error instanceof CatalogValidationError ? error.message : "Catalog seed failed. Check the reviewed dataset, local image files, and database configuration. Earlier products may have been committed; rerunning is safe. No source APIs were called.");
	process.exitCode = 1;
}).finally(async () => {
	// getDb is lazy. Avoid constructing a database client when local validation failed.
	if (seedStarted) await closeSeedConnection().catch(() => undefined);
});
