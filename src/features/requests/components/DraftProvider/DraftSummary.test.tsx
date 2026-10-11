import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { requestProduct } from "@/test/factories/requests";
import { requestsCopy } from "../../copy";
import type { DraftItem } from "../../types";
import { DraftProvider, useDraft } from "./DraftProvider";
import { DraftSummary } from "./DraftSummary";

const picturedItem: DraftItem = { ...requestProduct, imagePath: "/products/demo-milk.jpg", quantity: 2 };

function PreviewHarness({ items }: { items: DraftItem[] }) {
	const { draft, change } = useDraft();
	return <>
		<button onClick={() => items.forEach((item) => change({ type: "add", item }))}>Add groceries</button>
		<button onClick={() => change({ type: "quantity", sku: items[0].sku, quantity: 3 })}>Change quantity</button>
		<button onClick={() => change({ type: "remove", sku: items[0].sku })}>Remove grocery</button>
		<span data-testid="full-draft-size">{draft.items.length}</span>
		<DraftSummary />
	</>;
}

function renderPreview(items: DraftItem[] = [picturedItem]) {
	render(<DraftProvider><PreviewHarness items={items} /></DraftProvider>);
}

describe("shopping list preview", () => {
	it("explains an empty list without showing an empty review action", () => {
		renderPreview();
		expect(screen.getByRole("heading", { name: requestsCopy.detailTitle })).toBeInTheDocument();
		expect(screen.getByText(requestsCopy.draftCount(0))).toBeInTheDocument();
		expect(screen.getByText(requestsCopy.draftEmptyHelp)).toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: requestsCopy.basket })).not.toBeInTheDocument();
	});

	it("shows the product photo, name, size and quantity without prices", () => {
		renderPreview();
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		const item = within(screen.getByRole("listitem"));
		expect(item.getByText(picturedItem.displayName)).toBeInTheDocument();
		expect(item.getByText(picturedItem.sizeLabel)).toBeInTheDocument();
		const image = item.getByRole("img", { name: "Demo milk, 1 litre" });
		expect(image).toHaveAttribute("width", "64");
		expect(image).toHaveAttribute("height", "64");
		expect(image).toHaveAttribute("loading", "lazy");
		expect(item.getByRole("definition")).toHaveTextContent("2");
		expect(screen.getByRole("link", { name: requestsCopy.basket })).toHaveAttribute("href", "/shop/basket");
		expect(screen.queryByText(/\$|Demo price/)).not.toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent(requestsCopy.added(picturedItem.displayName));
	});

	it("keeps products recognizable when a photo is unavailable", () => {
		renderPreview([{ ...picturedItem, imagePath: null }]);
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		const list = screen.getByRole("list", { name: requestsCopy.listItems });
		expect(within(list).getByText(picturedItem.displayName)).toBeInTheDocument();
		expect(within(list).queryByRole("img")).not.toBeInTheDocument();
		expect(list.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
	});

	it("reflects quantity changes and removal from the shared draft", () => {
		renderPreview();
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		fireEvent.click(screen.getByRole("button", { name: "Change quantity" }));
		expect(screen.getByRole("definition")).toHaveTextContent("3");
		fireEvent.click(screen.getByRole("button", { name: "Remove grocery" }));
		expect(screen.getByText(requestsCopy.draftCount(0))).toBeInTheDocument();
		expect(screen.queryByRole("list")).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: requestsCopy.basket })).not.toBeInTheDocument();
	});

	it("bounds the preview to four rows without truncating the full draft", () => {
		const items = Array.from({ length: 6 }, (_, index) => ({
			...picturedItem, sku: `grocery-${index}`, displayName: `Grocery ${index}`,
		}));
		renderPreview(items);
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		expect(screen.getAllByRole("listitem")).toHaveLength(4);
		expect(screen.getByText(requestsCopy.draftCount(6))).toBeInTheDocument();
		expect(screen.getByText(requestsCopy.draftMore({ count: 2 }))).toBeInTheDocument();
		expect(screen.queryByText("Grocery 4")).not.toBeInTheDocument();
		expect(screen.getByTestId("full-draft-size")).toHaveTextContent("6");
		expect(screen.getByRole("link", { name: requestsCopy.basket })).toHaveAttribute("href", "/shop/basket");
	});

	it("preserves suggestion and substitution labels without exposing proofs", () => {
		renderPreview([{ ...picturedItem, origin: "SUGGESTED", isSubstitute: true, proof: "private-proof" }]);
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		expect(screen.getByText(requestsCopy.origins.SUGGESTED)).toBeInTheDocument();
		expect(screen.getByText(requestsCopy.substitute)).toBeInTheDocument();
		expect(screen.queryByText("private-proof")).not.toBeInTheDocument();
	});

	it("keeps draft-limit feedback in the mounted live region", () => {
		renderPreview();
		const status = screen.getByRole("status");
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		expect(screen.getByRole("status")).toBe(status);
		expect(status).toHaveTextContent(requestsCopy.limit);
		expect(status).toHaveAttribute("aria-live", "polite");
		expect(screen.getByRole("listitem")).toBeInTheDocument();
	});
});
