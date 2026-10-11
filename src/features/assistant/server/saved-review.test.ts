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

import { signShoppingProposal } from "@/server/auth/shopping-proposal";
import { encryptReview, decryptReview } from "@/server/auth/review-encryption";
import { AppError } from "@/server/errors";
import { displayItem } from "./grounding";
import { interpretShoppingForReview, restoreShoppingReview } from "./saved-review";

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
		expect(await save(original)).toMatchObject({ reviewId: requestIds.key, sourceProof: original.sourceProof });
		expect(fake.limit).toHaveBeenCalledWith(`assistant-review:device:${requester.deviceId}`, 30, 3_600_000);
		expect(fake.write).toHaveBeenCalledWith(requester, expect.any(String), expect.any(String), new Date(requestNow.getTime() + 30 * 60_000));
		const snapshot = decryptReview(requester, fake.write.mock.calls[0][2]) as { items: Record<string, unknown>[] };
		expect(snapshot.items[0]).not.toHaveProperty("displayName");
		expect(snapshot.items[0]).not.toHaveProperty("imagePath");
		expect(snapshot.items[0]).not.toHaveProperty("priceMinor");
		expect(snapshot.items[0]).not.toHaveProperty("proof");
	});

	it("restores products, quantities, choices and proof without interpretation or writes", async () => {
		const saved = await save();
		fake.interpret.mockClear(); fake.write.mockClear(); fake.limit.mockClear();
		const restored = await restoreShoppingReview(requester, saved.reviewId);
		expect(restored).toMatchObject({ reviewId: saved.reviewId, inputText: "milk", items: [
			{ sku: "demo-milk", quantity: 2, origin: "REQUESTED", proof: saved.sourceProof },
			{ sku: "demo-bread", quantity: 1, origin: "SUGGESTED", proof: saved.sourceProof },
		], questions: [{ options: [{ sku: "demo-rice", proof: saved.sourceProof }] }] });
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
		snapshot.items[1].origin = "REQUESTED";
		fake.read.mockResolvedValue({ payload: encryptReview(requester, snapshot) });
		expect(await restoreShoppingReview(requester, requestIds.key)).toBeNull();
	});

	it("keeps child reviews local, budget-free and child-filtered", async () => {
		await save();
		const child = { ...requester, profileKind: "CHILD" as const };
		expect(await restoreShoppingReview(child, requestIds.key)).not.toBeNull();
		expect(fake.catalog).toHaveBeenLastCalledWith(true, { skus: ["demo-milk", "demo-bread", "demo-rice"] });
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
});
