// @vitest-environment node
import { describe, expect, it } from "vitest";
import { requestIds } from "@/test/factories/requests";
import { closeRequestSchema, removeRequestItemSchema, requestListSchema, submitRequestSchema, updateRequestItemSchema } from "./schemas";

const input = { clientRequestKey: requestIds.key, inputMode: "PICTURES", items: [{ sku: "demo-milk", quantity: 1 }] };
describe("shopping request inputs", () => {
	it.each([1, 20])("accepts quantity boundary %s", (quantity) => {
		expect(submitRequestSchema.safeParse({ ...input, items: [{ sku: "demo-milk", quantity }] }).success).toBe(true);
	});
	it.each([0, -1, 21, 1.5, "2", null, NaN, Infinity])("rejects quantity %s", (quantity) => {
		expect(submitRequestSchema.safeParse({ ...input, items: [{ sku: "demo-milk", quantity }] }).success).toBe(false);
	});
	it.each(["TEXT", "VOICE", "PAID"])("keeps unfinished mode %s disabled", (inputMode) => {
		expect(submitRequestSchema.safeParse({ ...input, inputMode }).success).toBe(false);
	});
	it.each(["familyId", "profileId", "deviceId", "status", "budgetMinor", "priceMinor", "inputText"])("rejects client field %s", (field) => {
		expect(submitRequestSchema.safeParse({ ...input, [field]: "untrusted" }).success).toBe(false);
	});
	it("rejects empty, excessive, duplicate and enriched item payloads", () => {
		for (const items of [[], Array.from({ length: 31 }, (_, i) => ({ sku: `demo-${i}`, quantity: 1 })),
			[...input.items, ...input.items], [{ ...input.items[0], unitPriceMinor: 1 }]]) {
			expect(submitRequestSchema.safeParse({ ...input, items }).success).toBe(false);
		}
	});
	it("accepts 30 distinct products", () => {
		expect(submitRequestSchema.safeParse({ ...input, items: Array.from({ length: 30 }, (_, i) => ({ sku: `demo-${i}`, quantity: 20 })) }).success).toBe(true);
	});
	it.each(["", "INVALID", "../milk", "Milk", "a".repeat(61)])("rejects invalid SKU %s", (sku) => {
		expect(submitRequestSchema.safeParse({ ...input, items: [{ sku, quantity: 1 }] }).success).toBe(false);
	});
	it("requires a UUID key, item IDs, revision and deliberate confirmation", () => {
		expect(submitRequestSchema.safeParse({ ...input, clientRequestKey: "bad" }).success).toBe(false);
		expect(updateRequestItemSchema.safeParse({ requestId: requestIds.request, itemId: requestIds.item, quantity: 1, revision: 0 }).success).toBe(true);
		expect(removeRequestItemSchema.safeParse({ requestId: requestIds.request, itemId: "bad", revision: 0 }).success).toBe(false);
		expect(closeRequestSchema.safeParse({ requestId: requestIds.request, revision: 0, confirmed: false }).success).toBe(false);
		expect(closeRequestSchema.safeParse({ requestId: requestIds.request, revision: -1, confirmed: true }).success).toBe(false);
		expect(requestListSchema.safeParse({ status: "anything", after: requestIds.request }).success).toBe(false);
	});
});
