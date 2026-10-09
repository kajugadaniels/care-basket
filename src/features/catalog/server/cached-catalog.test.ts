// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ life: vi.fn(), tag: vi.fn(), list: vi.fn().mockResolvedValue([]), product: vi.fn().mockResolvedValue(null) }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheLife: mocks.life, cacheTag: mocks.tag }));
vi.mock("./repository", () => ({ listCatalogRows: mocks.list, findCatalogRow: mocks.product }));
import { readCatalogPage, readCatalogProduct } from "./cached-catalog";

describe("shared catalog cache boundaries", () => {
	beforeEach(() => { vi.clearAllMocks(); });
	it("tags shared category browsing with an explicit lifetime", async () => {
		await readCatalogPage({ q: "", category: "PANTRY", limit: 24 }, true);
		expect(mocks.life).toHaveBeenCalledWith("hours");
		expect(mocks.tag).toHaveBeenCalledWith("catalog");
		expect(mocks.list).toHaveBeenCalledWith({ q: "", category: "PANTRY", limit: 24 }, true);
	});
	it("never caches free-text search that might contain personal text", async () => {
		await readCatalogPage({ q: "fictional search", limit: 24 }, false);
		expect(mocks.list).toHaveBeenCalledWith({ q: "fictional search", limit: 24 }, false);
		expect(mocks.life).not.toHaveBeenCalled();
		expect(mocks.tag).not.toHaveBeenCalled();
	});
	it("uses the same shared catalog tag for individual sku reads", async () => {
		await readCatalogProduct("example-rice", true);
		expect(mocks.product).toHaveBeenCalledWith("example-rice", true);
		expect(mocks.tag).toHaveBeenCalledWith("catalog");
	});
});
