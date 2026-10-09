import { fireEvent, render, screen, within } from "@testing-library/react";
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
		const form = screen.getByRole("search");
		expect(form).toHaveAttribute("action", "/shop/products");
		expect(within(form).getByRole("combobox", { name: "Choose a category" })).toHaveValue("PANTRY");
		expect(within(form).getByRole("option", { name: "Drinks" })).toHaveValue("BEVERAGES");
		expect(form.querySelector('[name="cursor"]')).toBeNull();
	});
	it("retains filters in bounded pagination and resets the cursor for category changes", () => {
		render(<CatalogBrowser filters={{ q: "rice", category: "PANTRY", cursor: "old", limit: 24 }} result={{ products: [product], nextCursor: "next" }} />);
		expect(screen.getByRole("link", { name: "More Groceries" })).toHaveAttribute("href", "/shop/products?category=PANTRY&q=rice&cursor=next");
		expect(screen.getByRole("link", { name: "Back to First Groceries" })).toHaveAttribute("href", "/shop/products?category=PANTRY&q=rice");
		expect(screen.getByRole("navigation", { name: "Catalog pages" })).toBeInTheDocument();
		expect(catalogHref("/shop/products", { q: "rice & beans" })).toBe("/shop/products?q=rice+%26+beans");
	});
	it("keeps cards price-free and omits empty pagination", () => {
		render(<CatalogBrowser filters={{ q: "", limit: 24 }} result={{ products: [product], nextCursor: null }} />);
		const list = screen.getByRole("list", { name: "Look for groceries" });
		expect(within(list).getByRole("article", { name: "Example Rice" })).toBeInTheDocument();
		expect(screen.queryByText("Demo price")).not.toBeInTheDocument();
		expect(screen.queryByRole("navigation", { name: "Catalog pages" })).not.toBeInTheDocument();
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Look for groceries");
	});
	it("resets native filter fields when the URL filters change", () => {
		const result = { products: [product], nextCursor: null };
		const { rerender } = render(<CatalogBrowser filters={{ q: "rice", category: "PANTRY", limit: 24 }} result={result} />);
		fireEvent.change(screen.getByRole("searchbox"), { target: { value: "milk" } });
		fireEvent.change(screen.getByRole("combobox"), { target: { value: "DAIRY_EGGS" } });
		rerender(<CatalogBrowser filters={{ q: "", limit: 24 }} result={result} />);
		expect(screen.getByRole("searchbox")).toHaveValue("");
		expect(screen.getByRole("combobox")).toHaveValue("");
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
		expect(screen.queryByRole("search")).not.toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
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
