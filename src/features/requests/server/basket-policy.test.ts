// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { requestIds } from "@/test/factories/requests";
vi.mock("server-only", () => ({}));
import { basketSubtotal, submissionFingerprint } from "./basket-policy";

describe("basket integer invariants", () => {
	it("calculates minor-unit totals without floating point prices", () => {
		expect(basketSubtotal([{ quantity: 3, unitPriceMinor: 349 }, { quantity: 2, unitPriceMinor: 125 }])).toBe(1297);
	});
	it.each([
		{ items: [] },
		{ items: [{ quantity: 0, unitPriceMinor: 100 }] },
		{ items: [{ quantity: 21, unitPriceMinor: 100 }] },
		{ items: [{ quantity: 1, unitPriceMinor: -1 }] },
		{ items: [{ quantity: 1, unitPriceMinor: 3.49 }] },
		{ items: [{ quantity: 20, unitPriceMinor: 2_147_483_647 }] },
	])("rejects an invalid basket $items", ({ items }) => {
		expect(() => basketSubtotal(items)).toThrow("CONFLICT");
	});
	it("canonicalizes item order but detects different quantities and products", () => {
		const input = { clientRequestKey: requestIds.key, inputMode: "PICTURES" as const,
			items: [{ sku: "demo-milk", quantity: 2 }, { sku: "demo-bread", quantity: 1 }] };
		const hash = submissionFingerprint(input);
		expect(submissionFingerprint({ ...input, items: [...input.items].reverse() })).toBe(hash);
		expect(submissionFingerprint({ ...input, items: [{ sku: "demo-milk", quantity: 1 }] })).not.toBe(hash);
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});
});
