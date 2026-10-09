// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requester, requestIds, requestManager } from "@/test/factories/requests";
import { assistantCatalog, interpretation } from "@/test/factories/assistant";

const fake = vi.hoisted(() => ({ profile: vi.fn(), catalog: vi.fn(), preference: vi.fn(), write: vi.fn(),
	config: vi.fn(), limit: vi.fn(), interpret: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ getShoppingAiConfig: fake.config }));
vi.mock("@/lib/ai/get-provider", () => ({ getShoppingProvider: () => ({ interpret: fake.interpret }) }));
vi.mock("@/server/auth/shopping-proposal", () => ({ signShoppingProposal: () => "fictional-proof" }));
vi.mock("@/server/rate-limit/limiter", () => ({ enforceRateLimit: fake.limit }));
vi.mock("./repository", () => ({ AI_CONSENT_VERSION: "ai-shopping-v1", readAssistantProfile: fake.profile,
	readAssistantCatalog: fake.catalog, readAiPreference: fake.preference, writeAiPreference: fake.write,
	readProviderContext: async () => assistantCatalog.map((p) => ({ sku: p.sku, name: p.displayName,
		category: p.category, sizeLabel: p.sizeLabel, variantGroup: p.variantGroup, synonyms: p.synonyms })) }));
import { assistantAvailability, estimateShoppingBudget, interpretShopping, requireVoicePermission, updateAiPreference } from "./service";

const consent = { kind: "ASSISTED_ADULT", aiAssistEnabled: true,
	aiConsentConfirmedAt: new Date("2026-01-01"), aiConsentVersion: "ai-shopping-v1" };
describe("assistant authorization and grounding", () => {
	beforeEach(() => {
		vi.resetAllMocks(); fake.profile.mockResolvedValue(consent); fake.catalog.mockResolvedValue(assistantCatalog);
		fake.config.mockReturnValue(null); fake.preference.mockResolvedValue(consent);
	});
	it("uses genuine local matching when globally disabled, without provider or AI quota calls", async () => {
		const result = await interpretShopping(requester, { kind: "text", text: "milk and bread" });
		expect(result).toMatchObject({ local: true, inputMode: "TEXT", sourceProof: "fictional-proof" });
		expect(result.items.map((item) => item.sku)).toEqual(["demo-milk", "demo-bread"]);
		expect(result.items[0]).not.toHaveProperty("priceMinor");
		expect(fake.interpret).not.toHaveBeenCalled(); expect(fake.limit).not.toHaveBeenCalled();
	});
	it.each([new Error("timeout"), { status: 429 }, { status: 503 }])("preserves deterministic text fallback after provider failure %s", async (error) => {
		fake.config.mockReturnValue({ model: "gemini-test" }); fake.interpret.mockRejectedValue(error);
		expect(await interpretShopping(requester, { kind: "text", text: "milk" })).toMatchObject({ local: true });
		expect(fake.limit).toHaveBeenCalledWith(`ai:device:${requester.deviceId}`, 30, 3_600_000);
		expect(fake.limit).toHaveBeenCalledWith(`ai:family:${requester.familyId}`, 200, 86_400_000);
	});
	it("rejects invalid provider schema and locally matches the original text", async () => {
		fake.config.mockReturnValue({ model: "gemini-test" }); fake.interpret.mockResolvedValue({ items: [], prices: [500] });
		expect(await interpretShopping(requester, { kind: "text", text: "milk" })).toMatchObject({ local: true, inputText: "milk" });
	});
	it("falls back when the PostgreSQL quota refuses an AI call", async () => {
		fake.config.mockReturnValue({ model: "gemini-test" }); fake.limit.mockRejectedValue(new Error("quota"));
		expect(await interpretShopping(requester, { kind: "text", text: "bread" })).toMatchObject({ local: true });
		expect(fake.interpret).not.toHaveBeenCalled();
	});
	it("sends only compact product context and rechecks catalog after interpretation", async () => {
		fake.config.mockReturnValue({ model: "gemini-test" }); fake.interpret.mockResolvedValue(interpretation());
		fake.catalog.mockResolvedValueOnce(assistantCatalog).mockResolvedValueOnce([]);
		const result = await interpretShopping(requester, { kind: "text", text: "milk" });
		expect(result.items).toEqual([]); expect(result.unrecognized).toContain("milk");
		const sent = JSON.stringify(fake.interpret.mock.calls[0][0]);
		for (const forbidden of ["priceMinor", "familyId", "profileId", "deviceId", "aiConsent"]) expect(sent).not.toContain(forbidden);
	});
	it("rechecks consent immediately before transmitting data", async () => {
		fake.config.mockReturnValue({ model: "gemini-test" });
		fake.profile.mockResolvedValueOnce(consent).mockResolvedValueOnce({ ...consent, aiAssistEnabled: false });
		expect(await interpretShopping(requester, { kind: "text", text: "milk" })).toMatchObject({ local: true });
		expect(fake.interpret).not.toHaveBeenCalled();
	});
	it.each([{ aiConsentVersion: "old" }, { aiConsentConfirmedAt: null }, { aiConsentConfirmedAt: new Date("2099-01-01") }])(
		"does not accept incomplete or stale consent %s", async (overrides) => {
			fake.config.mockReturnValue({ model: "gemini-test" }); fake.profile.mockResolvedValue({ ...consent, ...overrides });
			expect(await assistantAvailability(requester)).toMatchObject({ voice: false });
		});
	it("never uses Gemini or budget totals for children, even with consent and configuration", async () => {
		const child = { ...requester, profileKind: "CHILD" as const };
		fake.config.mockReturnValue({ model: "gemini-test" }); fake.catalog.mockResolvedValue([]);
		const result = await interpretShopping(child, { kind: "text", text: "milk for $20" });
		expect(result).toMatchObject({ local: true, items: [], budgetMinor: null });
		expect(fake.catalog).toHaveBeenCalledWith(true, { text: "milk for $20" }); expect(fake.interpret).not.toHaveBeenCalled();
		await expect(requireVoicePermission(child)).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(estimateShoppingBudget(child, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
	});
	it("rejects voice while disabled and empty provider transcription while enabled", async () => {
		const audio = { kind: "audio" as const, audio: new Uint8Array(12), mimeType: "audio/webm" as const };
		await expect(interpretShopping(requester, audio)).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
		fake.config.mockReturnValue({ model: "gemini-test" }); fake.interpret.mockResolvedValue(interpretation({ transcript: "" }));
		await expect(interpretShopping(requester, audio)).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
	});
	it("rejects enabling consent without explicit confirmation or global approval, but permits revocation", async () => {
		await expect(updateAiPreference(requestManager, { profileId: requestIds.profile, enabled: true, consent: false })).rejects.toThrow();
		await expect(updateAiPreference(requestManager, { profileId: requestIds.profile, enabled: true, consent: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
		await updateAiPreference(requestManager, { profileId: requestIds.profile, enabled: false, consent: false });
		expect(fake.write).toHaveBeenCalledWith(requestManager, requestIds.profile, false);
	});
	it("does not update a cross-family or nonexistent profile", async () => {
		fake.preference.mockResolvedValue(null);
		await expect(updateAiPreference(requestManager, { profileId: requestIds.other, enabled: false, consent: false })).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(fake.write).not.toHaveBeenCalled();
	});
	it("returns only a budget-context total, never per-product prices", async () => {
		expect(await estimateShoppingBudget(requester, { budgetMinor: 2000, items: [{ sku: "demo-milk", quantity: 2 }] }))
			.toEqual({ line: "About $5.00 with demo prices, within your $20.00." });
	});
});
