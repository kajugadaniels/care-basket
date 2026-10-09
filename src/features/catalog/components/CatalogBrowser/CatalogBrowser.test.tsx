import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CatalogBrowser } from "./CatalogBrowser";
import { CatalogSkeleton } from "./CatalogSkeleton";
import { CatalogError } from "./CatalogError";
import { catalogHref } from "./catalog-href";
import type { CatalogProductDto } from "../../types";

const product: CatalogProductDto = { sku: "example-rice", displayName: "Example Rice", category: "PANTRY", sizeLabel: "1 lb", imagePath: null };

describe("catalog browsing", () => {
	it("renders a real empty state with a home path and no purchase controls", () => {
		render(<CatalogBrowser filters={{ q: "", limit: 24 }} result={{ products: [], nextCursor: null }} />);
		expect(screen.getByText("There are no groceries to look at yet.")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/shop");
		expect(screen.queryByRole("button", { name: /buy|pay|add|send/i })).not.toBeInTheDocument();
	});
	it("preserves search text and category, with labelled input and explicit search submit", () => {
		render(<CatalogBrowser filters={{ q: "rice", category: "PANTRY", limit: 24 }} result={{ products: [product], nextCursor: null }} />);
		expect(screen.getByRole("searchbox", { name: "Find groceries" })).toHaveValue("rice");
		expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("type", "submit");
		expect(screen.getByText("Rice & Pantry").closest("a")).toHaveAttribute("aria-current", "page");
		expect(screen.getByText("Drinks").closest("a")).toHaveAttribute("href", "/shop/products?category=BEVERAGES&q=rice");
	});
	it("retains filters in bounded pagination and resets the cursor for category changes", () => {
		render(<CatalogBrowser filters={{ q: "rice", category: "PANTRY", cursor: "old", limit: 24 }} result={{ products: [product], nextCursor: "next" }} />);
		expect(screen.getByRole("link", { name: "More Groceries" })).toHaveAttribute("href", "/shop/products?category=PANTRY&q=rice&cursor=next");
		expect(screen.getByRole("link", { name: "Back to First Groceries" })).toHaveAttribute("href", "/shop/products?category=PANTRY&q=rice");
		expect(screen.getByText("Drinks").closest("a")).toHaveAttribute("href", "/shop/products?category=BEVERAGES&q=rice");
		expect(catalogHref("/shop/products", { q: "rice & beans" })).toBe("/shop/products?q=rice+%26+beans");
	});
	it("explains no matches and offers clearing the filters", () => {
		render(<CatalogBrowser filters={{ q: "unknown", limit: 24 }} result={{ products: [], nextCursor: null }} />);
		expect(screen.getByText("We couldn't find any groceries like that.")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Show All" })).toHaveAttribute("href", "/shop/products");
	});
	it("announces loading without exposing decorative placeholders", () => {
		render(<CatalogSkeleton />);
		expect(screen.getByRole("status")).toHaveTextContent("Loading groceries…");
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});
	it("focuses a friendly error and provides retry and a safe home path", () => {
		const retry = vi.fn();
		render(<CatalogError requester retry={retry} />);
		expect(screen.getByRole("heading", { name: "We couldn't load the groceries" })).toHaveFocus();
		fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
		expect(retry).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/shop");
	});
});
