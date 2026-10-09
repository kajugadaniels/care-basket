import "server-only";
import { z } from "zod";
import type { CuratedCatalog } from "./curated-schema";
import { normalizeBarcode } from "./barcode";
import { permittedImageUrl } from "./normalize-product";

// Project only photo provenance. Suggested prices and review flags are never imported.
const reportSchema = z.object({
	version: z.literal(1),
	candidates: z.array(z.object({
		sourceProductId: z.int().positive(),
		sourceProductCode: z.string().max(14).regex(/^\d{8,14}$/),
		sourceSystem: z.enum(["off", "obf", "opf", "opff"]),
		imageCandidateUrl: z.string().max(300).nullable(),
		imageProductUrl: z.string().max(300).nullable(),
	})).max(200),
});

type ProductImage = NonNullable<CuratedCatalog["products"][number]["image"]>;

export function planCatalogImages(catalog: CuratedCatalog, input: unknown): { sku: string; image: ProductImage }[] {
	const report = reportSchema.parse(input);
	const plan: { sku: string; image: ProductImage }[] = [];
	for (const product of catalog.products) {
		if (product.image || product.source !== "OPEN_PRICES" || product.sourceSystem !== "off") continue;
		const matches = report.candidates.filter((candidate) => candidate.sourceProductId === product.sourceProductId &&
			candidate.sourceProductCode === product.sourceProductCode && candidate.sourceSystem === "off");
		if (matches.length > 1) throw new Error("Duplicate image candidates; review the discovery report.");
		const candidate = matches[0];
		if (!candidate?.imageCandidateUrl) continue;
		const url = permittedImageUrl(candidate.imageCandidateUrl);
		const productUrl = `https://world.openfoodfacts.org/product/${product.sourceProductCode}`;
		if (!url || candidate.imageProductUrl !== productUrl) continue;

		// The photo's barcode directory must identify this exact product, not merely an allowed host.
		const directory = new URL(url).pathname.split("/").slice(3, -1).join("");
		if (normalizeBarcode(directory) !== product.barcode) continue;
		const extension = url.split(".").pop()?.toLowerCase();
		plan.push({
			sku: product.sku,
			image: {
				path: `/products/${product.sku}.${extension}`,
				sourceUrl: url,
				productUrl,
				license: "CC BY-SA 3.0",
				attribution: "Open Food Facts contributors",
			},
		});
	}
	return plan;
}

export function renderImageAttribution(catalog: CuratedCatalog): string {
	const lines = ["# Product image attribution", "", "Original product photos are served locally, without edits.", ""];
	for (const product of catalog.products) {
		const image = product.image;
		if (!image) continue;
		lines.push(`- [${product.sku}](${image.path}): [original image](${image.sourceUrl}), ` +
			`[product record](${image.productUrl}). ${image.attribution}. ` +
			"[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).", "");
	}
	return lines.join("\n");
}
