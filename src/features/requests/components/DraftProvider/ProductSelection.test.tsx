import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { requestProduct } from "@/test/factories/requests";
import { CatalogBrowser } from "@/features/catalog/components/CatalogBrowser/CatalogBrowser";
import { DraftProvider } from "./DraftProvider";

describe("catalog draft selection", () => {
	it("announces adding, prevents duplicate cards and keeps quantities in bounds", () => {
		render(<DraftProvider><CatalogBrowser filters={{ q: "", limit: 24 }} selectable
			result={{ products: [requestProduct], nextCursor: null }} /></DraftProvider>);
		expect(screen.getByRole("button", { name: "Decrease quantity for Demo milk" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Increase quantity for Demo milk" }));
		fireEvent.click(screen.getByRole("button", { name: "Add to my list" }));
		expect(screen.getByText("Demo milk added to your list.")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Add to my list" })).not.toBeInTheDocument();
		expect(screen.getByText("Quantity: 2")).toBeInTheDocument();
		for (let i = 0; i < 18; i++) fireEvent.click(screen.getByRole("button", { name: "Increase quantity for Demo milk" }));
		expect(screen.getByRole("button", { name: "Increase quantity for Demo milk" })).toBeDisabled();
		expect(screen.getByText("Quantity: 20")).toBeInTheDocument();
	});
	it("preserves added items across search, category and pagination rerenders", () => {
		const { rerender } = render(<DraftProvider><CatalogBrowser filters={{ q: "", limit: 24 }} selectable
			result={{ products: [requestProduct], nextCursor: null }} /></DraftProvider>);
		fireEvent.click(screen.getByRole("button", { name: "Add to my list" }));
		rerender(<DraftProvider><CatalogBrowser filters={{ q: "bread", category: "BAKERY", cursor: "page-2", limit: 24 }} selectable
			result={{ products: [], nextCursor: null }} /></DraftProvider>);
		expect(screen.getByText("1 product in your list")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Check My List" })).toHaveAttribute("href", "/shop/basket");
		expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
	});
	it("explains unreviewed child suitability without inventing products", () => {
		render(<DraftProvider><CatalogBrowser filters={{ q: "", limit: 24 }} selectable child
			result={{ products: [], nextCursor: null }} /></DraftProvider>);
		expect(screen.getByText(/not yet been reviewed for your shopping experience/)).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Add to my list" })).not.toBeInTheDocument();
	});
});
