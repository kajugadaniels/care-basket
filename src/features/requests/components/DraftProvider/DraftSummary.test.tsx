import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { requestProduct } from "@/test/factories/requests";
import { requestsCopy } from "../../copy";
import type { DraftItem } from "../../types";
import { DraftProvider, useDraft } from "./DraftProvider";
import { DraftSummary } from "./DraftSummary";

const picturedItem: DraftItem = { ...requestProduct, imagePath: "/products/demo-milk.jpg", quantity: 2 };

function PreviewHarness({ items }: { items: DraftItem[] }) {
	const { draft, change, begin, finish } = useDraft();
	return <>
		<button onClick={() => items.forEach((item) => change({ type: "add", item }))}>Add groceries</button>
		<button onClick={() => change({ type: "quantity", sku: items[0].sku, quantity: 3 })}>Change quantity</button>
		<button onClick={() => change({ type: "remove", sku: items[0].sku })}>Remove grocery</button>
		<button onClick={() => begin()}>Lock draft</button>
		<button onClick={() => draft.clientRequestKey && finish(draft.clientRequestKey, false)}>Unlock draft</button>
		<button onClick={() => change({ type: "proposal", items, inputMode: "TEXT", inputText: "milk",
			sourceProof: "source-proof" })}>Add assistant groceries</button>
		<button onClick={() => change({ type: "add", item: { ...picturedItem, sku: "different-grocery", displayName: "Different grocery" } })}>Add different grocery</button>
		<span data-testid="full-draft-size">{draft.items.length}</span>
		<span data-testid="draft-source">{draft.sourceProof}</span>
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

	it("removes a grocery through its labelled icon control and offers undo", () => {
		renderPreview();
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		const remove = screen.getByRole("button", { name: requestsCopy.draftRemoveLabel({ name: picturedItem.displayName }) });
		expect(remove).toHaveTextContent(requestsCopy.draftRemove);
		expect(remove.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
		fireEvent.click(remove);
		expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent(requestsCopy.draftRemoved({ name: picturedItem.displayName }));
		expect(screen.getByRole("heading", { name: requestsCopy.detailTitle })).toHaveFocus();
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.undoRemove }));
		expect(screen.getByRole("definition")).toHaveTextContent("2");
		expect(screen.getByRole("img", { name: "Demo milk, 1 litre" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: requestsCopy.undoRemove })).not.toBeInTheDocument();
	});

	it("keeps other groceries and exposes the next row after a preview removal", () => {
		const items = Array.from({ length: 5 }, (_, index) => ({
			...picturedItem, sku: `grocery-${index}`, displayName: `Grocery ${index}`,
		}));
		renderPreview(items);
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.draftRemoveLabel({ name: "Grocery 0" }) }));
		const list = screen.getByRole("list", { name: requestsCopy.listItems });
		expect(within(list).getAllByRole("listitem")).toHaveLength(4);
		expect(within(list).getByText("Grocery 4")).toBeInTheDocument();
		expect(within(list).queryByText("Grocery 0")).not.toBeInTheDocument();
		expect(screen.getByTestId("full-draft-size")).toHaveTextContent("4");
		expect(list).toHaveAttribute("tabindex", "0");
	});

	it("prevents removals and undo while the draft is being sent", () => {
		renderPreview([picturedItem, { ...picturedItem, sku: "demo-bread", displayName: "Demo bread" }]);
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		fireEvent.click(screen.getByRole("button", { name: "Lock draft" }));
		const remove = screen.getByRole("button", { name: requestsCopy.draftRemoveLabel({ name: picturedItem.displayName }) });
		expect(remove).toBeDisabled();
		fireEvent.click(remove);
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		fireEvent.click(screen.getByRole("button", { name: "Unlock draft" }));
		fireEvent.click(remove);
		fireEvent.click(screen.getByRole("button", { name: "Lock draft" }));
		const undo = screen.getByRole("button", { name: requestsCopy.undoRemove });
		expect(undo).toBeDisabled();
		fireEvent.click(undo);
		expect(screen.getByTestId("full-draft-size")).toHaveTextContent("1");
		fireEvent.click(screen.getByRole("button", { name: "Unlock draft" }));
		fireEvent.click(undo);
		expect(screen.getByTestId("full-draft-size")).toHaveTextContent("2");
	});

	it("hides undo if the same product is added again", () => {
		renderPreview();
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.draftRemoveLabel({ name: picturedItem.displayName }) }));
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		expect(screen.queryByRole("button", { name: requestsCopy.undoRemove })).not.toBeInTheDocument();
		expect(screen.getByTestId("full-draft-size")).toHaveTextContent("1");
	});

	it("restores assistant provenance when undoing removal of the last grocery", () => {
		renderPreview([{ ...picturedItem, origin: "SUGGESTED", proof: "item-proof" }]);
		fireEvent.click(screen.getByRole("button", { name: "Add assistant groceries" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.draftRemoveLabel({ name: picturedItem.displayName }) }));
		expect(screen.getByTestId("draft-source")).toBeEmptyDOMElement();
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.undoRemove }));
		expect(screen.getByTestId("draft-source")).toHaveTextContent("source-proof");
		expect(screen.getByText(requestsCopy.origins.SUGGESTED)).toBeInTheDocument();
		expect(screen.getByRole("definition")).toHaveTextContent("2");
	});

	it("keeps undo available when restoring would exceed the draft limit", () => {
		const items = Array.from({ length: 30 }, (_, index) => ({
			...picturedItem, sku: `grocery-${index}`, displayName: `Grocery ${index}`,
		}));
		renderPreview(items);
		fireEvent.click(screen.getByRole("button", { name: "Add groceries" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.draftRemoveLabel({ name: "Grocery 0" }) }));
		fireEvent.click(screen.getByRole("button", { name: "Add different grocery" }));
		fireEvent.click(screen.getByRole("button", { name: requestsCopy.undoRemove }));
		expect(screen.getByRole("status")).toHaveTextContent(requestsCopy.limit);
		expect(screen.getByRole("button", { name: requestsCopy.undoRemove })).toBeEnabled();
		expect(screen.getByTestId("full-draft-size")).toHaveTextContent("30");
	});

	it("bounds a sticky desktop preview while leaving narrow layouts in normal flow", () => {
		const layout = readFileSync(resolve("src/features/catalog/components/CatalogBrowser/CatalogBrowser.module.css"), "utf8");
		const preview = readFileSync(resolve("src/features/requests/components/DraftProvider/DraftSummary.module.css"), "utf8");
		expect(layout).toMatch(/@media \(min-width: 64rem\) and \(min-height: 32rem\)\s*\{\s*\.withList \.listPanel\s*\{[^}]*position: sticky;[^}]*inset-block-start: var\(--space-5\);/);
		expect(preview).toMatch(/max-block-size: calc\(100dvh - var\(--space-5\) - var\(--space-5\)\);/);
		expect(preview).toMatch(/\.items\s*\{[^}]*min-block-size: 0;[^}]*overflow-y: auto;/);
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
