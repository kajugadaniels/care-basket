import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { devicesCopy } from "../../copy";
import { ShopShell } from "./ShopShell";

describe("shared shopping shell", () => {
	it("renders one main landmark with persistent home and a skip link", () => {
		render(<ShopShell><h1>Shopping</h1></ShopShell>);
		const main = screen.getByRole("main");
		expect(main).toHaveAttribute("id", "shop-main");
		expect(within(main).getByRole("heading", { level: 1 })).toHaveTextContent("Shopping");
		expect(screen.getByRole("link", { name: devicesCopy.shopHome })).toHaveAttribute("href", "/shop/assistant");
		expect(screen.getByRole("link", { name: devicesCopy.skipShopping })).toHaveAttribute("href", "#shop-main");
	});

	it("links the logo and platform name together to the assistant", () => {
		render(<ShopShell><h1>Shopping</h1></ShopShell>);
		const brand = within(screen.getByRole("banner")).getByRole("link", { name: "CareBasket" });
		expect(brand).toHaveAttribute("href", "/shop/assistant");
		expect(brand).toHaveTextContent("CareBasket");
		expect(brand.querySelector("svg")).toBeInTheDocument();
	});

	it("omits the family help disclosure from the top navigation", () => {
		render(<ShopShell><h1>Shopping</h1></ShopShell>);
		const header = screen.getByRole("banner");
		expect(within(header).queryByText("Ask your family")).not.toBeInTheDocument();
		expect(header.querySelector("details")).not.toBeInTheDocument();
	});

	it("keeps products and the draft list in the shared top navigation", () => {
		render(<ShopShell><h1>Start shopping</h1></ShopShell>);
		const navigation = within(screen.getByRole("navigation", { name: devicesCopy.shopNav }));
		expect(navigation.getByRole("link", { name: devicesCopy.shopProducts })).toHaveAttribute("href", "/shop/products");
		expect(navigation.getByRole("link", { name: devicesCopy.shopList })).toHaveAttribute("href", "/shop/basket");
		expect(navigation.getAllByRole("link")).toHaveLength(3);
		expect(within(screen.getByRole("main")).queryByRole("navigation")).not.toBeInTheDocument();
	});

	it.each(["Assistant", "Products", "My List", "Requests"])("omits the shared footer on the %s page", (title) => {
		render(<ShopShell><h1>{title}</h1></ShopShell>);
		expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
		expect(screen.queryByText("This is a demo. No real orders or deliveries.")).not.toBeInTheDocument();
		expect(within(screen.getByRole("main")).getByRole("heading", { name: title })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /sign in|pay|checkout/i })).not.toBeInTheDocument();
		expect(screen.getAllByRole("banner")).toHaveLength(1);
	});
});
