import { mkdir, writeFile, rename, unlink } from "node:fs/promises";
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

const optionsSchema = z.strictObject({
	pages: z.coerce.number().int().min(1).max(5).default(2),
	candidates: z.coerce.number().int().min(1).max(200).default(150),
	enrichments: z.coerce.number().int().min(0).max(100).default(30),
});

let phase: DiscoveryPhase = "options";

async function main() {
	const args = parseArgs({ options: { pages: { type: "string" }, candidates: { type: "string" }, enrichments: { type: "string" } } });
	const options = optionsSchema.parse(args.values);
	phase = "configuration";
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
	});
	phase = "report";
	const directory = resolve(".catalog-output");
	await mkdir(directory, { recursive: true });
	const temporary = resolve(directory, `candidates-${process.pid}.tmp`);
	try {
		await writeFile(temporary, JSON.stringify(report, null, "\t") + "\n", { flag: "wx", mode: 0o600 });
		// Only a successful, complete run replaces the previous report. Curated data is never touched.
		await rename(temporary, resolve(directory, "candidates.us.json"));
	} finally {
		await unlink(temporary).catch(() => undefined);
	}
	console.info(`Discovery finished: ${report.counts.verifiedProducts} candidate products require review. Report: .catalog-output/candidates.us.json. No database writes or price approvals.`);
}

main().catch((error: unknown) => {
	console.error(`Discovery stopped during ${phase}: ${describeDiscoveryFailure(error, phase)}`);
	console.error("The previous report, curated catalog, and database were not changed.");
	process.exitCode = 1;
});
