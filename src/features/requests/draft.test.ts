// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { requestIds, requestProduct } from "@/test/factories/requests";
import { changeDraft, createDraftKey, EMPTY_DRAFT } from "./draft";

describe("in-memory shopping draft", () => {
	it("supports cryptographic UUIDs on local HTTP devices without randomUUID", () => {
		const getRandomValues = vi.fn((values: Uint8Array) => values.fill(17));
		expect(createDraftKey({ getRandomValues } as unknown as Crypto)).toBe("11111111-1111-4111-9111-111111111111");
		expect(getRandomValues).toHaveBeenCalledOnce();
	});
	it("adds a SKU without prices, then changes quantity with a new key", () => {
		const draft = changeDraft(EMPTY_DRAFT, { type: "add", item: { ...requestProduct, quantity: 1 } }, requestIds.key);
		const changed = changeDraft(draft, { type: "quantity", sku: requestProduct.sku, quantity: 20 }, requestIds.other);
		expect(changed.items[0].quantity).toBe(20);
		expect(changed.clientRequestKey).toBe(requestIds.other);
		expect(draft.items[0].quantity).toBe(1);
	});
	it("deduplicates by refusing a second item with the same SKU", () => {
		const change = { type: "add" as const, item: { ...requestProduct, quantity: 1 } };
		const draft = changeDraft(EMPTY_DRAFT, change, requestIds.key);
		expect(() => changeDraft(draft, change, requestIds.other)).toThrow("DUPLICATE");
	});
	it.each([0, 21, 1.5])("refuses invalid quantity %s", (quantity) => {
		expect(() => changeDraft(EMPTY_DRAFT, { type: "add", item: { ...requestProduct, quantity } }, requestIds.key)).toThrow("LIMIT");
	});
	it("limits distinct products to 30", () => {
		const draft = { items: Array.from({ length: 30 }, (_, i) => ({ ...requestProduct, sku: `demo-${i}`, quantity: 1 })), clientRequestKey: requestIds.key };
		expect(() => changeDraft(draft, { type: "add", item: { ...requestProduct, quantity: 1 } }, requestIds.other)).toThrow("LIMIT");
	});
	it("removes items and clears the key when the final item is removed", () => {
		const draft = changeDraft(EMPTY_DRAFT, { type: "add", item: { ...requestProduct, quantity: 1 } }, requestIds.key);
		expect(changeDraft(draft, { type: "remove", sku: requestProduct.sku }, requestIds.other)).toEqual(EMPTY_DRAFT);
		expect(changeDraft(draft, { type: "clear" }, requestIds.other)).toEqual(EMPTY_DRAFT);
	});
});
