import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadScriptEnvironment } from "../src/lib/env/scripts";
import { getCloudinaryCloudName } from "../src/lib/env/server";
import { CatalogValidationError, validateSeedCatalog } from "../src/features/catalog/server/curated-schema";
import { seedCatalog } from "../src/features/catalog/server/seed-service";
import { validateSeedImages } from "../src/features/catalog/server/image-assets";
import { closeSeedConnection } from "../src/features/catalog/server/seed-repository";
import { describeSeedFailure, type SeedPhase } from "../src/features/catalog/server/seed-error";

let seedStarted = false;
let phase: SeedPhase = "input";

async function main() {
	loadScriptEnvironment();
	const raw: unknown = JSON.parse(await readFile(resolve("prisma/catalog/catalog.us.json"), "utf8"));
	const catalog = validateSeedCatalog(raw);
	phase = "images";
	await validateSeedImages(catalog, getCloudinaryCloudName());
	seedStarted = true;
	phase = "database";
	const result = await seedCatalog(catalog);
	console.info(`Seeded ${result.products} reviewed products. No products were deleted. Restart/redeploy the app after seeding to invalidate the catalog cache.`);
}

main().catch((error: unknown) => {
	const diagnostic = error instanceof CatalogValidationError ? error.message : describeSeedFailure(error, phase);
	console.error(`Catalog seed failed during ${phase}: ${diagnostic}`);
	process.exitCode = 1;
}).finally(async () => {
	// getDb is lazy. Avoid constructing a database client when local validation failed.
	if (seedStarted) await closeSeedConnection().catch(() => undefined);
});
