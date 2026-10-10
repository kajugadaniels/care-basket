import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { requestProduct } from "@/test/factories/requests";
import { CatalogBrowser } from "@/features/catalog/components/CatalogBrowser/CatalogBrowser";
import { DraftProvider, useDraft } from "./DraftProvider";
import { ProductSelection } from "./ProductSelection";

function SuggestedSelection() {
	const { change } = useDraft();
	return <>
		<button onClick={() => change({ type: "add", item: { ...requestProduct, quantity: 6, origin: "SUGGESTED" } })}>Load suggestion</button>
		<ProductSelection product={requestProduct}><p>{requestProduct.displayName}</p></ProductSelection>
	</>;
}

describe("catalog draft selection", () => {
	it("uses initial quantities and a custom add handler without also adding a catalog item", () => {
		const onAdd = vi.fn();
		render(<DraftProvider><ProductSelection product={requestProduct} initialQuantity={5} maxQuantity={6} onAdd={onAdd}>
			<p>{requestProduct.displayName}</p>
		</ProductSelection></DraftProvider>);
		expect(screen.getByText("Quantity: 5")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Increase quantity for Demo milk" }));
		expect(screen.getByRole("button", { name: "Increase quantity for Demo milk" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Add to my list" }));
		expect(onAdd).toHaveBeenCalledExactlyOnceWith(6);
		expect(screen.getByRole("button", { name: "Add to my list" })).toBeEnabled();
		expect(screen.queryByRole("button", { name: "Remove item: Demo milk" })).not.toBeInTheDocument();
	});
	it("keeps an assistant suggestion capped at six when it is viewed in the catalog", () => {
		render(<DraftProvider><SuggestedSelection /></DraftProvider>);
		fireEvent.click(screen.getByRole("button", { name: "Load suggestion" }));
		expect(screen.getByText("Quantity: 6")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Increase quantity for Demo milk" })).toBeDisabled();
		fireEvent.click(screen.getByRole("button", { name: "Decrease quantity for Demo milk" }));
		expect(screen.getByText("Quantity: 5")).toBeInTheDocument();
	});
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
