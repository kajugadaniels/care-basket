import "server-only";
import { z } from "zod";
import type { OpenPricesClient } from "@/lib/open-prices/client";
import type { OpenPricesProduct } from "@/lib/open-prices/types";
import type { FoodFactsMetadata } from "@/lib/open-food-facts/client";
import { CATALOG_MARKET } from "../config";
import { CATEGORY_TAGS, PRODUCT_CATEGORIES } from "../taxonomy";
import type { ProductCategory } from "../taxonomy";
import { normalizeBarcode } from "./barcode";
import { observationCutoff, suggestDemoPrice } from "./demo-prices";
import type { VerifiedObservation } from "./demo-prices";
import { normalizeProduct } from "./normalize-product";
import { createObservationVerifier } from "./verify-observation";

type DiscoveryOptions = {
	today: string;
	maxPagesPerCategory: number;
	maxCandidates: number;
	maxEnrichments: number;
	signal?: AbortSignal;
};

type DiscoveryCandidate = Extract<ReturnType<typeof normalizeProduct>, { ok: true }>["product"] & {
	verification: VerifiedObservation[];
	suggestedDemoPrice: ReturnType<typeof suggestDemoPrice>;
	approved: false;
	reviewRequired: string[];
};

export async function discoverCatalog(
	client: OpenPricesClient,
	enrich: (code: string, signal?: AbortSignal) => Promise<FoodFactsMetadata | null>,
	options: DiscoveryOptions,
) {
	z.strictObject({
		today: z.iso.date(),
		maxPagesPerCategory: z.int().min(1).max(5),
		maxCandidates: z.int().min(1).max(200),
		maxEnrichments: z.int().min(0).max(100),
	}).parse({
		today: options.today, maxPagesPerCategory: options.maxPagesPerCategory,
		maxCandidates: options.maxCandidates, maxEnrichments: options.maxEnrichments,
	});
	const verify = createObservationVerifier((id) => client.location(id, options.signal));
	const seenPrices = new Set<number>();
	const groups = new Map<string, { source: OpenPricesProduct; observations: VerifiedObservation[]; category: ProductCategory }>();
	const categoryCounts = new Map<ProductCategory, number>();
	const categoryBudget = Math.ceil(options.maxCandidates / PRODUCT_CATEGORIES.length);
	const reasons: Record<string, number> = {};
	const counts = { fetched: 0, malformed: 0, verifiedObservations: 0, verifiedProducts: 0, incomplete: 0, excluded: 0, insufficientObservations: 0, requiresCuration: 0, enrichments: 0 };
	const skip = (reason: string) => { reasons[reason] = (reasons[reason] ?? 0) + 1; };

	for (const category of PRODUCT_CATEGORIES) {
		// Share the existing request budget across tags before reading deeper pages.
		// Sparse categories deliberately leave capacity unused rather than filling it with fruit.
		const tags = CATEGORY_TAGS[category].map((tag) => ({ tag, page: 1, exhausted: false }));
		for (let request = 0; request < options.maxPagesPerCategory; request += 1) {
			const available = tags.filter((tag) => !tag.exhausted);
			available.sort((left, right) => left.page - right.page);
			const target = available[0];
			if (!target) break;
			const { tag: categoryTag, page } = target;
			const result = await client.prices({ page, size: 50, categoryTag, dateFrom: observationCutoff(options.today) }, options.signal);
			counts.fetched += result.items.length + result.malformed;
			counts.malformed += result.malformed;
			for (const price of result.items) {
				if (seenPrices.has(price.id)) { skip("duplicate-source-price"); continue; }
				seenPrices.add(price.id);
				const verified = await verify(price, options.today);
				if (!verified.ok) { skip(verified.reason); continue; }
				counts.verifiedObservations += 1;
				const barcode = normalizeBarcode(price.product_code);
				if (!barcode || !price.product || normalizeBarcode(price.product.code) !== barcode) { skip("missing-or-mismatched-product"); continue; }
				let group = groups.get(barcode);
				if (!group) {
					if ((categoryCounts.get(category) ?? 0) >= categoryBudget) { skip("category-candidate-limit"); continue; }
					if (groups.size >= options.maxCandidates) { skip("candidate-limit"); continue; }
					group = { source: price.product, observations: [], category };
					groups.set(barcode, group);
					categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
				}
				group.observations.push(verified.observation);
			}
			target.page += 1;
			target.exhausted = page >= result.pages || result.items.length + result.malformed === 0;
		}
	}

	const candidates: DiscoveryCandidate[] = [];
	const reviewItems: { sourceProductId: number; sourceProductCode: string; status: string; reason: string }[] = [];
	// Interleave enrichment too, so its smaller budget reaches multiple categories.
	const buckets = PRODUCT_CATEGORIES.map((category) => [...groups.values()].filter((group) => group.category === category));
	const balancedGroups = Array.from({ length: categoryBudget }, (_, index) => buckets.flatMap((bucket) => bucket[index] ? [bucket[index]] : [])).flat();
	for (const { source, observations } of balancedGroups) {
		let normalized = normalizeProduct(source);
		// Only food products with proven U.S. observations may enter the secondary adapter.
		if ((!normalized.ok || !normalized.product.imageCandidateUrl) && source.source === "off" &&
			(!normalized.ok ? normalized.reason !== "excluded-policy" && normalized.reason !== "invalid-barcode" : true) && counts.enrichments < options.maxEnrichments) {
			counts.enrichments += 1;
			normalized = normalizeProduct(source, await enrich(source.code, options.signal));
		}
		if (!normalized.ok) {
			skip(normalized.reason);
			reviewItems.push({
				sourceProductId: source.id, sourceProductCode: source.code,
				status: normalized.reason === "excluded-policy" ? "EXCLUDED" : "INCOMPLETE",
				reason: normalized.reason,
			});
			if (normalized.reason === "excluded-policy") counts.excluded += 1;
			else counts.incomplete += 1;
			continue;
		}
		counts.verifiedProducts += 1;
		counts.requiresCuration += 1;
		const suggestedDemoPrice = suggestDemoPrice(observations, options.today);
		if (!suggestedDemoPrice) counts.insufficientObservations += 1;
		reviewItems.push({
			sourceProductId: source.id, sourceProductCode: source.code,
			status: suggestedDemoPrice ? "VERIFIED_REQUIRES_CURATION" : "INSUFFICIENT_OBSERVATIONS",
			reason: suggestedDemoPrice ? "human-review-required" : "no-recent-nondiscounted-prices",
		});
		candidates.push({
			...normalized.product,
			verification: observations,
			suggestedDemoPrice,
			approved: false,
			reviewRequired: ["name", "category", "variantGroup", "synonyms", "child suitability", "quantity", "image license", "demo price"],
		});
	}
	return {
		version: 1, market: CATALOG_MARKET, asOf: options.today,
		license: "ODbL 1.0", attribution: "Open Food Facts and Open Prices contributors",
		limits: { maxPagesPerCategory: options.maxPagesPerCategory, maxCandidates: options.maxCandidates, maxEnrichments: options.maxEnrichments },
		coverage: PRODUCT_CATEGORIES.map((category) => ({
			category,
			candidates: candidates.filter((candidate) => candidate.category === category).length,
			imageCandidates: candidates.filter((candidate) => candidate.category === category && candidate.imageCandidateUrl).length,
		})),
		observationsComplete: false,
		notice: "Bounded discovery sample, not current store prices or approved seed input. Counts describe this run only. Manually curate source gaps; do not claim coverage of the whole market.",
		counts, skipReasons: reasons, reviewItems, candidates,
	};
}
