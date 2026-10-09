import "server-only";
import { validateSeedCatalog } from "./curated-schema";
import { upsertCuratedProducts } from "./seed-repository";

export async function seedCatalog(input: unknown, now = new Date()) {
	const catalog = validateSeedCatalog(input, now);
	return upsertCuratedProducts(catalog);
}
