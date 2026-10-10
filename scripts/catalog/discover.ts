import { mkdir, readFile, stat, writeFile, rename, unlink } from "node:fs/promises";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { z } from "zod";
import { loadScriptEnvironment } from "../../src/lib/env/scripts";
import { getCatalogEnv } from "../../src/lib/env/server";
import { createOpenPricesClient } from "../../src/lib/open-prices/client";
import { createOpenFoodFactsClient } from "../../src/lib/open-food-facts/client";
import { discoverCatalog } from "../../src/features/catalog/server/discovery";
import { describeDiscoveryFailure } from "../../src/features/catalog/server/discovery-error";
import type { DiscoveryPhase } from "../../src/features/catalog/server/discovery-error";
import { PRODUCT_CATEGORIES } from "../../src/features/catalog/taxonomy";
import { CatalogValidationError, validateSeedCatalog } from "../../src/features/catalog/server/curated-schema";

const optionsSchema = z.strictObject({
	pages: z.coerce.number().int().min(1).max(5).default(2),
	candidates: z.coerce.number().int().min(1).max(200).default(150),
	enrichments: z.coerce.number().int().min(0).max(100).default(30),
	category: z.enum(PRODUCT_CATEGORIES).optional(),
	"new-only": z.boolean().default(false),
	"ready-only": z.boolean().default(false),
});

let phase: DiscoveryPhase = "options";

async function main() {
	const args = parseArgs({ options: {
		pages: { type: "string" }, candidates: { type: "string" }, enrichments: { type: "string" },
		category: { type: "string" }, "new-only": { type: "boolean" }, "ready-only": { type: "boolean" },
	} });
	const options = optionsSchema.parse(args.values);
	phase = "configuration";
	const existingBarcodes: string[] = [];
	const existingSourceProductIds: number[] = [];
	if (options["new-only"]) {
		try {
			const catalogPath = resolve("prisma/catalog/catalog.us.json");
			const file = await stat(catalogPath);
			if (!file.isFile() || file.size > 10 * 1024 * 1024) throw new Error("Catalog exceeds its size limit.");
			const catalog = validateSeedCatalog(JSON.parse(await readFile(catalogPath, "utf8")) as unknown);
			for (const product of catalog.products) {
				if (product.barcode) existingBarcodes.push(product.barcode);
				if (product.sourceProductId) existingSourceProductIds.push(product.sourceProductId);
			}
		} catch {
			// Do not misdiagnose a catalog read/validation failure as a missing User-Agent.
			throw new CatalogValidationError("Existing catalog could not be read or validated.");
		}
	}
	loadScriptEnvironment();
	const { CATALOG_USER_AGENT: userAgent } = getCatalogEnv();
	const prices = createOpenPricesClient({ userAgent });
	const foods = createOpenFoodFactsClient({ userAgent });
	const controller = new AbortController();
	process.once("SIGINT", () => controller.abort());
	phase = "sources";
	const report = await discoverCatalog(prices, (code, signal) => foods.product(code, signal), {
		today: new Date().toISOString().slice(0, 10), maxPagesPerCategory: options.pages,
		maxCandidates: options.candidates, maxEnrichments: options.enrichments, signal: controller.signal,
		categories: options.category ? [options.category] : undefined,
		existingBarcodes, existingSourceProductIds, readyOnly: options["ready-only"],
	});
	phase = "report";
	const directory = resolve(".catalog-output");
	await mkdir(directory, { recursive: true });
	const temporary = resolve(directory, `candidates-${process.pid}.tmp`);
	// Keep expansion batches separate from the report used by the image importer.
	const filtered = options["new-only"] || options["ready-only"] || options.category;
	const reportName = filtered
		? `candidates.review${options.category ? `.${options.category.toLowerCase()}` : ""}.us.json`
		: "candidates.us.json";
	try {
		await writeFile(temporary, JSON.stringify(report, null, "\t") + "\n", { flag: "wx", mode: 0o600 });
		// Only a successful, complete run replaces the previous report. Curated data is never touched.
		await rename(temporary, resolve(directory, reportName));
	} finally {
		await unlink(temporary).catch(() => undefined);
	}
	console.info(`Discovery finished: ${report.candidates.length} candidate products require review. Report: .catalog-output/${reportName}. No database writes or price approvals.`);
	console.info(`Skipped ${report.skipReasons["already-curated-product"] ?? 0} observations for existing products; held ${report.reviewItems.filter((item) => item.status === "HELD_FOR_COMPLETION").length} products without a photo URL or suggested price.`);
	for (const entry of report.coverage) {
		console.info(`${entry.category}: ${entry.candidates} candidates, ${entry.imageCandidates} possible photos (not yet reviewed).`);
	}
}

main().catch((error: unknown) => {
	const description = error instanceof CatalogValidationError
		? "The --new-only filter requires a readable, nonempty, valid prisma/catalog/catalog.us.json (at most 10 MiB), with approvals not in the future. Review that file before rerunning."
		: describeDiscoveryFailure(error, phase);
	console.error(`Discovery stopped during ${phase}: ${description}`);
	console.error("The previous report, curated catalog, and database were not changed.");
	process.exitCode = 1;
});
