import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { devicesCopy } from "../../copy";
import { ShopShell } from "./ShopShell";

describe("shared shopping shell", () => {
	it("renders one main landmark with persistent home and help", () => {
		render(<ShopShell><h1>Shopping</h1></ShopShell>);
		const main = screen.getByRole("main");
		expect(main).toHaveAttribute("id", "shop-main");
		expect(within(main).getByRole("heading", { level: 1 })).toHaveTextContent("Shopping");
		expect(screen.getByRole("link", { name: devicesCopy.shopHome })).toHaveAttribute("href", "/shop/assistant");
		expect(screen.getByText(devicesCopy.askFamily).closest("summary")).toBeInTheDocument();
		expect(screen.getByText(devicesCopy.shopHelp).closest("details")).not.toHaveAttribute("open");
		expect(screen.getByRole("link", { name: devicesCopy.skipShopping })).toHaveAttribute("href", "#shop-main");
	});

	it("keeps products and the draft list in the shared top navigation", () => {
		render(<ShopShell><h1>Start shopping</h1></ShopShell>);
		const navigation = within(screen.getByRole("navigation", { name: devicesCopy.shopNav }));
		expect(navigation.getByRole("link", { name: devicesCopy.shopProducts })).toHaveAttribute("href", "/shop/products");
		expect(navigation.getByRole("link", { name: devicesCopy.shopList })).toHaveAttribute("href", "/shop/basket");
		expect(navigation.getAllByRole("link")).toHaveLength(3);
		expect(within(screen.getByRole("main")).queryByRole("navigation")).not.toBeInTheDocument();
	});

	it("shows truthful demo information without account or payment controls", () => {
		render(<ShopShell><p>Groceries</p></ShopShell>);
		expect(screen.getByRole("contentinfo")).toHaveTextContent(devicesCopy.shopDemo);
		expect(screen.queryByRole("button", { name: /sign in|pay|checkout/i })).not.toBeInTheDocument();
		expect(screen.getAllByRole("banner")).toHaveLength(1);
	});
});
