// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requester, requestManager, requestIds } from "@/test/factories/requests";
import { assistantCatalog } from "@/test/factories/assistant";
const fake = vi.hoisted(() => ({ profile: vi.fn(), catalog: vi.fn(), update: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ managedProfile: { findFirst: fake.profile }, catalogProduct: { findMany: fake.catalog }, $transaction: fake.transaction }) }));
import { readAssistantCatalog, readAssistantProfile, readProviderContext, writeAiPreference } from "./repository";
describe("assistant scoped repository", () => {
	beforeEach(() => {
		vi.resetAllMocks(); fake.update.mockResolvedValue({ count: 1 });
		fake.transaction.mockImplementation((work) => work({ managedProfile: { updateMany: fake.update }, auditLog: { create: fake.audit } }));
		fake.catalog.mockResolvedValue(assistantCatalog.map(({ priceMinor, ...product }) => ({ ...product, demoPrices: [{ priceMinor }] })));
	});
	it("derives profile and family scope from the authenticated actor", async () => {
		await readAssistantProfile(requester);
		expect(fake.profile).toHaveBeenCalledWith(expect.objectContaining({ where: {
			id: requester.profileId, familyId: requester.familyId, kind: requester.profileKind } }));
	});
	it("enforces active, unarchived, approved USD and child suitability in the database query", async () => {
		await readAssistantCatalog(true);
		expect(fake.catalog).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
			isActive: true, archivedAt: null, isChildSuitable: true,
			demoPrices: { some: expect.objectContaining({ currency: "USD", approvedAt: expect.any(Object) }) } }) }));
	});
	it("excludes unsafe catalog content and invalid base quantities", async () => {
		fake.catalog.mockResolvedValue([{ ...assistantCatalog[0], displayName: "<script>pay now</script>", demoPrices: [{ priceMinor: 250 }] },
			{ ...assistantCatalog[1], netQuantity: 0, demoPrices: [{ priceMinor: 200 }] }]);
		expect(await readAssistantCatalog(false)).toEqual([]);
	});
	it("records separately versioned consent and audit atomically", async () => {
		await writeAiPreference(requestManager, requestIds.profile, true);
		expect(fake.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: requestIds.profile, familyId: requestIds.family, kind: "ASSISTED_ADULT" },
			data: { aiAssistEnabled: true, aiConsentConfirmedAt: expect.any(Date), aiConsentVersion: "ai-shopping-v1" } }));
		expect(fake.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "profile.ai_consent_granted" }) }));
	});
	it("category-prefilters oversized catalogs and refuses oversized categories instead of truncating", async () => {
		const rows = Array.from({ length: 201 }, () => ({ ...assistantCatalog[0], demoPrices: [{ priceMinor: 250 }] }));
		fake.catalog.mockResolvedValueOnce(rows).mockResolvedValueOnce([]);
		expect(await readAssistantCatalog(false, { text: "milk" })).toEqual([]);
		expect(fake.catalog).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ category: { in: ["DAIRY_EGGS"] } }) }));
		fake.catalog.mockResolvedValue(rows);
		await expect(readAssistantCatalog(false, { text: "milk" })).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
	});
	it("returns a price-free, validated public catalog context", async () => {
		fake.catalog.mockResolvedValue(assistantCatalog.map(({ sku, displayName, category, sizeLabel, variantGroup, synonyms }) =>
			({ sku, displayName, category, sizeLabel, variantGroup, synonyms })));
		const context = await readProviderContext([]);
		expect(context[0]).toMatchObject({ sku: "demo-milk", name: "Milk" });
		expect(JSON.stringify(context)).not.toContain("priceMinor");
	});
	it("clears consent on revocation and rejects missing scoped update without audit", async () => {
		await writeAiPreference(requestManager, requestIds.profile, false);
		expect(fake.update).toHaveBeenCalledWith(expect.objectContaining({ data: { aiAssistEnabled: false, aiConsentConfirmedAt: null, aiConsentVersion: null } }));
		fake.audit.mockClear(); fake.update.mockResolvedValue({ count: 0 });
		await expect(writeAiPreference(requestManager, requestIds.other, false)).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(fake.audit).not.toHaveBeenCalled();
	});
});
