import { describe, expect, it } from "vitest";
import { makeManagerRequest, requestIds } from "@/test/factories/requests";
import { previewBasketQuantity } from "./basket-preview";

describe("provisional quantity totals", () => {
	it("previews integer snapshot cents without changing the confirmed request or revision", () => {
		const request = makeManagerRequest();
		request.items.push({ ...request.items[0], id: requestIds.other, quantity: 1, unitPriceMinor: 199 });
		const preview = previewBasketQuantity(request, { itemId: requestIds.item, quantity: 3 });
		expect(preview).toMatchObject({ subtotalMinor: 949, subtotal: "$9.49", revision: 0, status: "PENDING_REVIEW" });
		expect(preview.items[0]).toMatchObject({ quantity: 3, lineTotal: "$7.50", unitPriceMinor: 250 });
		expect(preview.items[1]).toBe(request.items[1]);
		expect(request.items[0]).toMatchObject({ quantity: 2, lineTotal: "$5.00" });
		expect(request.subtotalMinor).toBe(500);
	});
	it("rebases on new authoritative prices rather than parsing formatted strings", () => {
		const request = makeManagerRequest();
		request.items[0] = { ...request.items[0], unitPriceMinor: 305, unitPrice: "not a money source" };
		expect(previewBasketQuantity(request, { itemId: requestIds.item, quantity: 3 }).subtotal).toBe("$9.15");
	});
	it.each([0, 21, 1.5, NaN, Infinity])("does not preview invalid quantity %s", (quantity) => {
		const request = makeManagerRequest();
		expect(previewBasketQuantity(request, { itemId: requestIds.item, quantity })).toBe(request);
	});
	it("does not preview missing items or a read-only request", () => {
		const request = makeManagerRequest();
		expect(previewBasketQuantity(request, { itemId: requestIds.other, quantity: 3 })).toBe(request);
		const locked = makeManagerRequest({ editable: false });
		expect(previewBasketQuantity(locked, { itemId: requestIds.item, quantity: 3 })).toBe(locked);
	});
});
