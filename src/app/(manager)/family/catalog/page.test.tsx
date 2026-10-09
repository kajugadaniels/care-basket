import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveServerTree } from "@/test/resolve-server-tree";
const mocks = vi.hoisted(() => ({ adult: vi.fn(), list: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.adult }));
vi.mock("@/features/catalog/server/service", () => ({ listManagerProducts: mocks.list }));
import CatalogPage from "./page";
import CatalogLoading from "./loading";

const actor = { type: "adult", userId: "adult", familyId: "family", role: "OWNER" };

function renderCatalogPage(searchParams: Record<string, string> = {}) {
	return resolveServerTree(CatalogPage({ searchParams: Promise.resolve(searchParams) }));
}

describe("protected manager catalog entry", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.adult.mockResolvedValue(actor);
		mocks.list.mockResolvedValue({ products: [], nextCursor: null });
	});
	it("reads the session only inside the streamed catalog", () => {
		CatalogPage({ searchParams: Promise.resolve({}) });
		expect(mocks.adult).not.toHaveBeenCalled();
	});
	it("requires adult membership before returning demo-price data", async () => {
		render(await renderCatalogPage());
		expect(mocks.adult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
		expect(mocks.list).toHaveBeenCalledWith(actor, { q: "", limit: 24 });
		expect(screen.getByRole("heading", { level: 1, name: "Product catalog" })).toBeInTheDocument();
		expect(screen.getByRole("search")).toBeInTheDocument();
	});
	it("never reads catalog data after an adult authorization failure", async () => {
		mocks.adult.mockRejectedValue(new Error("sign-in redirect"));
		await expect(renderCatalogPage()).rejects.toThrow("sign-in redirect");
		expect(mocks.list).not.toHaveBeenCalled();
	});
	it("rejects malformed filters before reading the catalog", async () => {
		await expect(renderCatalogPage({ category: "TOYS" })).rejects.toThrow();
		expect(mocks.list).not.toHaveBeenCalled();
	});
	it("shows the real header while the catalog loads", () => {
		render(<CatalogLoading />);
		expect(screen.getByRole("heading", { level: 1, name: "Product catalog" })).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("Loading products…");
		expect(screen.queryByRole("search")).not.toBeInTheDocument();
	});
});
