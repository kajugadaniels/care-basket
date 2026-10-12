// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdultActor } from "@/server/auth/require-adult";
import type { DeviceActor } from "@/server/auth/device-policy";
const mocks = vi.hoisted(() => ({ page: vi.fn(), product: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./cached-catalog", () => ({ readCatalogPage: mocks.page, readCatalogProduct: mocks.product }));
import { getRequesterProduct, listRequesterProducts } from "./service";

const device: DeviceActor = { type: "device", deviceId: "device", familyId: "family", profileId: "profile", profileKind: "ASSISTED_ADULT" };
const adult: AdultActor = { type: "adult", userId: "adult", familyId: "family", role: "OWNER" };
const row = { id: "019a1234-0000-7000-8000-000000000001", sku: "example-rice", displayName: "Example Rice", category: "PANTRY", sizeLabel: "1 lb", imagePath: null, brand: "Example", source: "OPEN_PRICES", imageAttribution: null, imageSourceUrl: null, imageProductUrl: null, demoPrices: [{ priceMinor: 349, currency: "USD" }] };

describe("catalog actor boundaries", () => {
	beforeEach(() => { mocks.page.mockReset().mockResolvedValue([row]); mocks.product.mockReset().mockResolvedValue(row); });
	it("returns only the safe adult device DTO and never passes actor identity to cache", async () => {
		const result = await listRequesterProducts(device, {});
		expect(result.products[0]).toEqual({ sku: row.sku, displayName: row.displayName, category: row.category, sizeLabel: row.sizeLabel, imagePath: null });
		expect(mocks.page).toHaveBeenCalledWith({ q: "", limit: 24 }, false);
		expect(JSON.stringify(result)).not.toContain("price");
		expect(JSON.stringify(result)).not.toContain("family");
	});
	it("denies legacy child actors before page or product cache reads", async () => {
		const child = { ...device, profileKind: "CHILD" as const };
		await expect(listRequesterProducts(child, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(getRequesterProduct(child, "example-rice")).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(mocks.page).not.toHaveBeenCalled();
		expect(mocks.product).not.toHaveBeenCalled();
	});
	it("rejects the wrong actor type before reading the catalog", async () => {
		await expect(listRequesterProducts(adult as unknown as DeviceActor, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
		expect(mocks.page).not.toHaveBeenCalled();
	});
	it("validates filters and returns bounded cursor pagination", async () => {
		mocks.page.mockResolvedValue([row, { ...row, id: "019a1234-0000-7000-8000-000000000002" }]);
		expect(await listRequesterProducts(device, { category: "PANTRY", q: "rice", limit: 1 })).toMatchObject({ products: [expect.any(Object)], nextCursor: row.id });
		await expect(listRequesterProducts(device, { limit: 999 })).rejects.toThrow();
	});
	it("handles empty results and unavailable storage without falling back to observations", async () => {
		mocks.page.mockResolvedValue([]);
		expect(await listRequesterProducts(device, {})).toEqual({ products: [], nextCursor: null, previousCursor: null });
		mocks.page.mockRejectedValue(new Error("database unavailable"));
		await expect(listRequesterProducts(device, {})).rejects.toThrow();
	});
	it("reverses backward results after removing lookahead and provides both boundaries", async () => {
		const middle = { ...row, id: "019a1234-0000-7000-8000-000000000002", sku: "middle" };
		const last = { ...row, id: "019a1234-0000-7000-8000-000000000003", sku: "last" };
		mocks.page.mockResolvedValue([last, middle, row]);
		const result = await listRequesterProducts(device, { before: "019a1234-0000-7000-8000-000000000004", limit: 2 });
		expect(result.products.map((product) => product.sku)).toEqual(["middle", "last"]);
		expect(result).toMatchObject({ previousCursor: middle.id, nextCursor: last.id });
	});
	it("omits Previous on the earliest backward page and permits recovery from empty windows", async () => {
		mocks.page.mockResolvedValue([row]);
		const boundary = "019a1234-0000-7000-8000-000000000004";
		expect(await listRequesterProducts(device, { before: boundary })).toMatchObject({ previousCursor: null, nextCursor: row.id });
		mocks.page.mockResolvedValue([]);
		expect(await listRequesterProducts(device, { cursor: boundary })).toMatchObject({ previousCursor: boundary, nextCursor: null });
		expect(await listRequesterProducts(device, { before: boundary })).toMatchObject({ previousCursor: null, nextCursor: boundary });
	});
	it("applies the same suitability and not-found rules to individual lookups", async () => {
		await getRequesterProduct(device, "example-rice");
		expect(mocks.product).toHaveBeenCalledWith("example-rice", false);
		mocks.product.mockResolvedValue(null);
		await expect(getRequesterProduct(device, "missing-product")).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
	it("rejects adult actors and malformed SKUs before individual lookups", async () => {
		await expect(getRequesterProduct(adult as unknown as DeviceActor, "example-rice")).rejects.toMatchObject({ code: "FORBIDDEN" });
		await expect(getRequesterProduct(device, "invalid/sku")).rejects.toThrow();
		expect(mocks.product).not.toHaveBeenCalled();
	});
});
