import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ManagerProductDto } from "../../types";
import { ManagerCatalog } from "./ManagerCatalog";
import { ManagerCatalogSkeleton } from "./ManagerCatalogSkeleton";

const product: ManagerProductDto = {
	sku: "example-rice",
	displayName: "Example Rice",
	category: "PANTRY",
	sizeLabel: "1 lb",
	imagePath: null,
	brand: "Example",
	demoPrice: { priceMinor: 349, currency: "USD" },
	attribution: "Example source, ODbL",
	imageAttribution: null,
	imageSourceUrl: null,
	imageProductUrl: null,
};

describe("manager catalog", () => {
	it("preserves filters on backward navigation without retaining an after boundary", () => {
		render(<ManagerCatalog filters={{ q: "rice", category: "PANTRY", cursor: "old", limit: 24 }} result={{ products: [product], previousCursor: "previous", nextCursor: "next" }} />);
		expect(screen.getByRole("link", { name: "Previous Groceries" })).toHaveAttribute("href", "/family/catalog?category=PANTRY&q=rice&before=previous");
	});
	it("keeps search text and category in one labelled search form", () => {
		render(<ManagerCatalog filters={{ q: "rice", category: "PANTRY", limit: 24 }} result={{ products: [product], nextCursor: null }} />);
		const search = screen.getByRole("search");
		expect(within(search).getByRole("searchbox", { name: "Search products" })).toHaveValue("rice");
		expect(within(search).getByRole("combobox", { name: "Category" })).toHaveValue("PANTRY");
		expect(within(search).getByRole("button", { name: "Search" })).toHaveAttribute("type", "submit");
	});

	it("summarizes results and active filters, with a way to clear them", () => {
		render(<ManagerCatalog filters={{ q: "rice", category: "PANTRY", limit: 24 }} result={{ products: [product], nextCursor: null }} />);
		expect(screen.getByRole("status")).toHaveTextContent("1 product on this page");
		const active = screen.getByRole("list", { name: "Active filters" });
		expect(within(active).getByText("Rice & Pantry")).toBeInTheDocument();
		expect(within(active).getByText("“rice”")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Show All" })).toHaveAttribute("href", "/family/catalog");
	});

	it("shows demo-priced product cards in a labelled list", () => {
		render(<ManagerCatalog filters={{ q: "", limit: 24 }} result={{ products: [product], nextCursor: null }} />);
		const card = within(screen.getByRole("list", { name: "Product catalog" })).getByRole("article", { name: "Example Rice" });
		expect(within(card).getByText("$3.49")).toBeInTheDocument();
		expect(within(card).getByText("Demo price")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Show All" })).not.toBeInTheDocument();
		expect(screen.queryByRole("navigation", { name: "Catalog pages" })).not.toBeInTheDocument();
	});

	it("retains filters in bounded pagination", () => {
		render(<ManagerCatalog filters={{ q: "rice", category: "PANTRY", cursor: "old", limit: 24 }} result={{ products: [product], nextCursor: "next" }} />);
		const pages = screen.getByRole("navigation", { name: "Catalog pages" });
		expect(within(pages).getByRole("link", { name: "More Groceries" })).toHaveAttribute("href", "/family/catalog?category=PANTRY&q=rice&cursor=next");
		expect(within(pages).getByRole("link", { name: "Back to First Groceries" })).toHaveAttribute("href", "/family/catalog?category=PANTRY&q=rice");
	});

	it("explains an empty catalog and a search without matches", () => {
		const { rerender } = render(<ManagerCatalog filters={{ q: "", limit: 24 }} result={{ products: [], nextCursor: null }} />);
		expect(screen.getByRole("heading", { name: "There are no groceries to look at yet." })).toBeInTheDocument();
		rerender(<ManagerCatalog filters={{ q: "unknown", limit: 24 }} result={{ products: [], nextCursor: null }} />);
		expect(screen.getByRole("heading", { name: "We couldn't find any groceries like that." })).toBeInTheDocument();
	});

	it("keeps the simulation notice and the data sources link", () => {
		render(<ManagerCatalog filters={{ q: "", limit: 24 }} result={{ products: [], nextCursor: null }} />);
		expect(screen.getByText("This store is simulated. No real orders or deliveries are placed.")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Data Sources" })).toHaveAttribute("href", "/data-sources");
	});

	it("announces loading while its placeholders stay out of the accessibility tree", () => {
		render(<ManagerCatalogSkeleton />);
		expect(screen.getByRole("status")).toHaveTextContent("Loading products…");
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
		expect(screen.queryByRole("search")).not.toBeInTheDocument();
	});
});
