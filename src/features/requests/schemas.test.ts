// @vitest-environment node
import { describe, expect, it } from "vitest";
import { requestIds } from "@/test/factories/requests";
import { closeRequestSchema, removeRequestItemSchema, requestListSchema, requestNotificationsSchema, submitRequestSchema, updateRequestItemSchema } from "./schemas";

const input = { clientRequestKey: requestIds.key, inputMode: "PICTURES", items: [{ sku: "demo-milk", quantity: 1 }] };
describe("request notification response", () => {
	const item = { id: requestIds.request, displayName: "Rose", submittedAt: "2026-10-12T12:00:00Z", message: "Rose has sent a shopping list." };
	it("accepts a bounded feed with a larger total count", () => {
		expect(requestNotificationsSchema.safeParse({ count: 125, notifications: [item] }).success).toBe(true);
	});
	it("rejects invalid counts, excess entries, unsafe links and unexpected data", () => {
		for (const payload of [
			{ count: -1, notifications: [] }, { count: 1.5, notifications: [] },
			{ count: 9, notifications: Array.from({ length: 9 }, () => item) },
			{ count: 1, notifications: [{ ...item, id: "../other-family" }] },
			{ count: 1, notifications: [{ ...item, submittedAt: "invalid" }] },
			{ count: 1, notifications: [{ ...item, inputText: "private" }] },
		]) expect(requestNotificationsSchema.safeParse(payload).success).toBe(false);
	});
});
describe("shopping request inputs", () => {
	it.each([1, 20])("accepts quantity boundary %s", (quantity) => {
		expect(submitRequestSchema.safeParse({ ...input, items: [{ sku: "demo-milk", quantity }] }).success).toBe(true);
	});
	it.each([0, -1, 21, 1.5, "2", null, NaN, Infinity])("rejects quantity %s", (quantity) => {
		expect(submitRequestSchema.safeParse({ ...input, items: [{ sku: "demo-milk", quantity }] }).success).toBe(false);
	});
	it.each(["TEXT", "VOICE", "PAID"])("rejects unsupported or incomplete mode %s", (inputMode) => {
		expect(submitRequestSchema.safeParse({ ...input, inputMode }).success).toBe(false);
	});
	it.each(["familyId", "profileId", "deviceId", "status", "budgetMinor", "priceMinor"])("rejects client field %s", (field) => {
		expect(submitRequestSchema.safeParse({ ...input, [field]: "untrusted" }).success).toBe(false);
	});
	it.each(["TEXT", "VOICE"])("accepts a complete %s request without client prices", (inputMode) => {
		expect(submitRequestSchema.safeParse({ ...input, inputMode, inputText: "milk" }).success).toBe(true);
	});
	it("requires deliberate budget confirmation and bounds text", () => {
		expect(submitRequestSchema.safeParse({ ...input, budgetMinor: 2000 }).success).toBe(false);
		expect(submitRequestSchema.safeParse({ ...input, budgetMinor: 2000, budgetConfirmed: true }).success).toBe(true);
		expect(submitRequestSchema.safeParse({ ...input, inputMode: "TEXT", inputText: "a".repeat(501) }).success).toBe(false);
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
