import "server-only";
import { getCloudinaryCloudName } from "@/lib/env/server";
import { CatalogValidationError, validateSeedCatalog } from "./curated-schema";
import { upsertCuratedProducts } from "./seed-repository";

export async function seedCatalog(input: unknown, now = new Date()) {
	const catalog = validateSeedCatalog(input, now);
	const remoteImages = catalog.products.flatMap((product) => product.image?.cloudinary ? [product.image.cloudinary] : []);
	if (remoteImages.length) {
		const cloudName = getCloudinaryCloudName();
		if (remoteImages.some((image) => image.cloudName !== cloudName)) {
			throw new CatalogValidationError("Catalog images require the matching CLOUDINARY_CLOUD_NAME; no writes were made.");
		}
	}
	return upsertCuratedProducts(catalog);
}
