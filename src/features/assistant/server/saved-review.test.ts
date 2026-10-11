// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requester, requestIds, requestNow, requestManager } from "@/test/factories/requests";
import { assistantCatalog } from "@/test/factories/assistant";
import type { DeviceActor } from "@/server/auth/device-policy";
import type { Proposal } from "../types";

const fake = vi.hoisted(() => ({ interpret: vi.fn(), read: vi.fn(), write: vi.fn(), catalog: vi.fn(), limit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./service", () => ({ interpretShopping: fake.interpret }));
vi.mock("./repository", () => ({ readAssistantReview: fake.read, writeAssistantReview: fake.write, readAssistantCatalog: fake.catalog }));
vi.mock("@/server/rate-limit/limiter", () => ({ enforceRateLimit: fake.limit }));
vi.mock("@/lib/env/server", () => ({ getDeviceEnv: () => ({ DEVICE_AUTH_SECRET: "fictional-test-only-review-encryption-key" }) }));

import { signShoppingProposal, verifyShoppingProposal } from "@/server/auth/shopping-proposal";
import { encryptReview, decryptReview } from "@/server/auth/review-encryption";
import { AppError } from "@/server/errors";
import { displayItem } from "./grounding";
import { interpretShoppingForReview, restoreShoppingReview, loadShoppingReviewPage } from "./saved-review";
import type { GroundedProposal } from "./grounding";
import { snapshotItem } from "./review-snapshot";

function proposal(overrides: Partial<Proposal> = {}): Proposal {
	const value: Proposal = { inputMode: "TEXT", inputText: "milk", local: true, budgetMinor: null,
		items: [displayItem(assistantCatalog[0], 2, "REQUESTED"), displayItem(assistantCatalog[1], 1, "SUGGESTED")],
		questions: [{ question: "Which one would you like?", options: [displayItem(assistantCatalog[2], 1, "REQUESTED")] }],
		unrecognized: [], ...overrides };
	value.sourceProof = signShoppingProposal(requester, { inputMode: value.inputMode, inputText: value.inputText,
		items: [...value.items, ...value.questions.flatMap((question) => question.options)]
			.map(({ sku, origin, isSubstitute, substitutionNote }) => ({ sku, origin, isSubstitute, substitutionNote })) });
	return value;
}

async function save(value = proposal()) {
	fake.interpret.mockResolvedValue(value);
	const result = await interpretShoppingForReview(requester, { kind: "text", text: value.inputText });
	fake.read.mockResolvedValue({ payload: fake.write.mock.calls.at(-1)![2] });
	return result;
}

describe("reloadable private shopping reviews", () => {
	beforeEach(() => {
		vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(requestNow);
		fake.write.mockResolvedValue({ reviewId: requestIds.key });
		fake.catalog.mockResolvedValue(assistantCatalog);
	});
	afterEach(() => vi.useRealTimers());

	it("saves only an encrypted bounded server proposal and returns an opaque lookup ID", async () => {
		const original = proposal();
		const saved = await save(original);
		expect(saved).toMatchObject({ reviewId: requestIds.key });
		expect(verifyShoppingProposal(requester, saved.sourceProof!)).toMatchObject({
			reviewDigest: expect.stringMatching(/^[a-f0-9]{64}$/), expiresAt: requestNow.getTime() + 30 * 60_000,
		});
		expect(fake.limit).toHaveBeenCalledWith(`assistant-review:device:${requester.deviceId}`, 30, 3_600_000);
		expect(fake.write).toHaveBeenCalledWith(requester, expect.any(String), expect.any(String), new Date(requestNow.getTime() + 30 * 60_000));
		const snapshot = decryptReview(requester, fake.write.mock.calls[0][2]) as { items: Record<string, unknown>[] };
		expect(snapshot.items[0]).not.toHaveProperty("displayName");
		expect(snapshot.items[0]).not.toHaveProperty("imagePath");
		expect(snapshot.items[0]).not.toHaveProperty("priceMinor");
		expect(snapshot.items[0]).not.toHaveProperty("proof");
	});

	it("restores choices together with fixed-expiry provenance without interpretation or writes", async () => {
		const saved = await save();
		fake.interpret.mockClear(); fake.write.mockClear(); fake.limit.mockClear();
		const restored = await restoreShoppingReview(requester, saved.reviewId);
		expect(restored).toMatchObject({ reviewId: saved.reviewId, inputText: "milk", items: [
			{ sku: "demo-milk", quantity: 2, origin: "REQUESTED", proof: expect.any(String) },
			{ sku: "demo-rice", quantity: 1, origin: "REQUESTED", proof: expect.any(String) },
			{ sku: "demo-bread", quantity: 1, origin: "SUGGESTED", proof: expect.any(String) },
		], questions: [], nextOffset: null });
		expect(verifyShoppingProposal(requester, restored!.items[0].proof!).expiresAt)
			.toBe(verifyShoppingProposal(requester, saved.sourceProof!).expiresAt);
		expect(restored?.items[0]).not.toHaveProperty("priceMinor");
		expect(fake.interpret).not.toHaveBeenCalled();
		expect(fake.write).not.toHaveBeenCalled();
		expect(fake.limit).not.toHaveBeenCalled();
	});

	it("rebuilds current product images and omits products removed from the active catalog", async () => {
		await save();
		fake.catalog.mockResolvedValue([{ ...assistantCatalog[0], displayName: "Current milk", imagePath: "/products/demo-milk.jpg" }]);
		const restored = await restoreShoppingReview(requester, requestIds.key);
		expect(restored?.items).toEqual([expect.objectContaining({ displayName: "Current milk", imagePath: "/products/demo-milk.jpg" })]);
		expect(restored?.questions).toEqual([]);
	});

	it("shows recovery when every saved product is no longer eligible", async () => {
		await save();
		fake.catalog.mockResolvedValue([]);
		expect(await restoreShoppingReview(requester, requestIds.key)).toBeNull();
	});

	it.each([[undefined], [""], ["bad-id"], [[requestIds.key, requestIds.other]]])("rejects invalid or repeated lookup IDs without database access", async (id) => {
		expect(await restoreShoppingReview(requester, id)).toBeNull();
		expect(fake.read).not.toHaveBeenCalled();
	});

	it("shows the same recovery result for absent and expired reviews without extending signed expiry", async () => {
		fake.read.mockResolvedValue(null);
		expect(await restoreShoppingReview(requester, requestIds.key)).toBeNull();
		await save();
		vi.setSystemTime(requestNow.getTime() + 30 * 60_000);
		fake.write.mockClear();
		expect(await restoreShoppingReview(requester, requestIds.key)).toBeNull();
		expect(fake.write).not.toHaveBeenCalled();
	});

	it.each(["deviceId", "profileId", "familyId"] as const)("cannot restore another %s's review even if a repository returns the row", async (field) => {
		await save();
		expect(await restoreShoppingReview({ ...requester, [field]: requestIds.other }, requestIds.key)).toBeNull();
	});

	it("rejects changed suggestion provenance instead of relabelling it as requested", async () => {
		await save();
		const snapshot = decryptReview(requester, fake.write.mock.calls[0][2]) as { items: { origin: string }[] };
		snapshot.items.find((item) => item.origin === "SUGGESTED")!.origin = "REQUESTED";
		fake.read.mockResolvedValue({ payload: encryptReview(requester, snapshot) });
		expect(await restoreShoppingReview(requester, requestIds.key)).toBeNull();
	});

	it("keeps child reviews local, budget-free and child-filtered", async () => {
		await save();
		const child = { ...requester, profileKind: "CHILD" as const };
		expect(await restoreShoppingReview(child, requestIds.key)).not.toBeNull();
		expect(fake.catalog).toHaveBeenLastCalledWith(true, { skus: ["demo-milk", "demo-rice", "demo-bread"] });
		await save(proposal({ local: false }));
		expect(await restoreShoppingReview(child, requestIds.key)).toBeNull();
	});

	it("does not interpret or save when the review quota is exceeded", async () => {
		fake.limit.mockRejectedValue(new AppError("RATE_LIMITED"));
		await expect(interpretShoppingForReview(requester, { kind: "text", text: "milk" })).rejects.toMatchObject({ code: "RATE_LIMITED" });
		expect(fake.interpret).not.toHaveBeenCalled();
		expect(fake.write).not.toHaveBeenCalled();
	});

	it("denies adult actors without any review access", async () => {
		await expect(restoreShoppingReview(requestManager as unknown as DeviceActor, requestIds.key)).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(fake.read).not.toHaveBeenCalled();
	});

	it("paginates beyond four choices and fairly includes bread and milk in the first twelve", async () => {
		const bread = Array.from({ length: 20 }, (_, index) => ({ ...assistantCatalog[1], sku: `bread-${index}` }));
		const milk = Array.from({ length: 20 }, (_, index) => ({ ...assistantCatalog[0], sku: `milk-${index}` }));
		const candidates = [...bread, ...milk];
		fake.catalog.mockResolvedValue(candidates);
		const questions: GroundedProposal["questions"] = [
			{ question: "Choose bread", options: bread.slice(0, 4).map((product) => displayItem(product, 1, "REQUESTED")),
				candidates: bread.map((product) => displayItem(product, 1, "REQUESTED")) },
			{ question: "Choose milk", options: milk.slice(0, 4).map((product) => displayItem(product, 1, "REQUESTED")),
				candidates: milk.map((product) => displayItem(product, 1, "REQUESTED")) },
		];
		const value: Proposal & GroundedProposal = { ...proposal({ items: [], questions }), questions };
		const first = await save(value);
		expect(first.items).toHaveLength(12);
		expect(first.items.slice(0, 4).map((item) => item.sku)).toEqual(["bread-0", "milk-0", "bread-1", "milk-1"]);
		expect(first.nextOffset).toBe(12);
		const expiry = verifyShoppingProposal(requester, first.sourceProof!).expiresAt;
		vi.advanceTimersByTime(10 * 60_000);
		fake.interpret.mockClear(); fake.write.mockClear(); fake.catalog.mockClear();
		const next = await loadShoppingReviewPage(requester, { reviewId: first.reviewId, offset: 12 });
		expect(next.items).toHaveLength(12);
		expect(next.items[0].sku).toBe("bread-6");
		expect(next.nextCursor).toBe(24);
		expect(fake.catalog.mock.calls[0][1].skus).toHaveLength(12);
		expect(verifyShoppingProposal(requester, next.items[0].proof!).expiresAt).toBe(expiry);
		expect(fake.interpret).not.toHaveBeenCalled(); expect(fake.write).not.toHaveBeenCalled();
		const last = await loadShoppingReviewPage(requester, { reviewId: first.reviewId, offset: 36 });
		expect(last.items).toHaveLength(4);
		expect(last.nextCursor).toBeNull();
	});

	it("retains legacy signed reviews without extending their expiry", async () => {
		const original = proposal();
		fake.read.mockResolvedValue({ payload: encryptReview(requester, {
			...original, items: original.items.map(snapshotItem),
			questions: original.questions.map((question) => ({ ...question, options: question.options.map(snapshotItem) })),
		}) });
		const restored = await restoreShoppingReview(requester, requestIds.key);
		expect(restored?.items).toHaveLength(3);
		expect(restored?.items[0].proof).toBe(original.sourceProof);
		expect(fake.write).not.toHaveBeenCalled();
	});

	it.each([-12, 1, 204])("rejects invalid paging offset %s before any read", async (offset) => {
		await expect(loadShoppingReviewPage(requester, { reviewId: requestIds.key, offset })).rejects.toThrow();
		expect(fake.read).not.toHaveBeenCalled();
	});

	it("stops paging when the quota refuses the read", async () => {
		fake.limit.mockRejectedValue(new AppError("RATE_LIMITED"));
		await expect(loadShoppingReviewPage(requester, { reviewId: requestIds.key, offset: 12 })).rejects.toMatchObject({ code: "RATE_LIMITED" });
		expect(fake.read).not.toHaveBeenCalled();
	});

	it("does not accept a changed candidate quantity under the original signed digest", async () => {
		await save();
		const snapshot = decryptReview(requester, fake.write.mock.calls[0][2]) as { items: { quantity: number }[] };
		snapshot.items[0].quantity = 20;
		fake.read.mockResolvedValue({ payload: encryptReview(requester, snapshot) });
		expect(await restoreShoppingReview(requester, requestIds.key)).toBeNull();
	});
});
