// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdultActor } from "@/server/auth/require-adult";
import type { DeviceActor } from "@/server/auth/device-policy";
const mocks = vi.hoisted(() => ({ page: vi.fn(), product: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./cached-catalog", () => ({ readCatalogPage: mocks.page, readCatalogProduct: mocks.product }));
import { getManagerProduct, getRequesterProduct, listManagerProducts, listRequesterProducts } from "./service";

const device: DeviceActor = { type: "device", deviceId: "device", familyId: "family", profileId: "profile", profileKind: "CHILD" };
const adult: AdultActor = { type: "adult", userId: "adult", familyId: "family", role: "OWNER" };
const row = { id: "019a1234-0000-7000-8000-000000000001", sku: "example-rice", displayName: "Example Rice", category: "PANTRY", sizeLabel: "1 lb", imagePath: null, brand: "Example", source: "OPEN_PRICES", imageAttribution: null, imageSourceUrl: null, imageProductUrl: null, demoPrices: [{ priceMinor: 349, currency: "USD" }] };

describe("catalog actor boundaries", () => {
	beforeEach(() => { mocks.page.mockReset().mockResolvedValue([row]); mocks.product.mockReset().mockResolvedValue(row); });
	it("returns only the safe device DTO and passes child suitability, never actor identity, to cache", async () => {
		const result = await listRequesterProducts(device, {});
		expect(result.products[0]).toEqual({ sku: row.sku, displayName: row.displayName, category: row.category, sizeLabel: row.sizeLabel, imagePath: null });
		expect(mocks.page).toHaveBeenCalledWith({ q: "", limit: 24 }, true);
		expect(JSON.stringify(result)).not.toContain("price");
		expect(JSON.stringify(result)).not.toContain("family");
	});
	it("allows assisted adults to browse without child-only filtering", async () => {
		await listRequesterProducts({ ...device, profileKind: "ASSISTED_ADULT" }, {});
		expect(mocks.page).toHaveBeenCalledWith({ q: "", limit: 24 }, false);
	});
	it.each(["OWNER", "MANAGER"] as const)("returns approved demo prices to adult %s", async (role) => {
		expect((await listManagerProducts({ ...adult, role }, {})).products[0]).toMatchObject({ demoPrice: { priceMinor: 349, currency: "USD" }, attribution: expect.stringContaining("ODbL") });
	});
	it("rejects the wrong actor type before reading the catalog", async () => {
		await expect(listManagerProducts(device as unknown as AdultActor, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
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
		expect(await listRequesterProducts(device, {})).toEqual({ products: [], nextCursor: null });
		mocks.page.mockRejectedValue(new Error("database unavailable"));
		await expect(listManagerProducts(adult, {})).rejects.toThrow();
	});
	it("applies the same suitability and not-found rules to individual lookups", async () => {
		await getRequesterProduct(device, "example-rice");
		expect(mocks.product).toHaveBeenCalledWith("example-rice", true);
		mocks.product.mockResolvedValue(null);
		await expect(getManagerProduct(adult, "missing-product")).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});
