import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import brandStyles from "@/components/layout/Brand/Brand.module.css";
import { DraftProvider, useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { requestProduct } from "@/test/factories/requests";
import { devicesCopy } from "../../copy";
import { ShopShell } from "./ShopShell";

function renderShell(children = <h1>Shopping</h1>) {
	return render(<DraftProvider><ShopShell>{children}</ShopShell></DraftProvider>);
}

function AddProduct() {
	const { change } = useDraft();
	return <button onClick={() => change({ type: "add", item: requestProduct })}>Add product</button>;
}

describe("shared shopping shell", () => {
	it("renders one main landmark and a skip link", () => {
		renderShell();
		const main = screen.getByRole("main");
		expect(main).toHaveAttribute("id", "shop-main");
		expect(within(main).getByRole("heading", { level: 1 })).toHaveTextContent("Shopping");
		expect(screen.getByRole("link", { name: devicesCopy.skipShopping })).toHaveAttribute("href", "#shop-main");
	});

	it("links an accessible logo-only brand to the assistant", () => {
		renderShell();
		const brand = within(screen.getByRole("banner")).getByRole("link", { name: "CareBasket" });
		expect(brand).toHaveAttribute("href", "/shop/assistant");
		expect(brand.querySelector("svg")).toBeInTheDocument();
		expect(screen.getByText("CareBasket")).toHaveClass(brandStyles.visuallyHidden);
	});

	it("omits the family help disclosure from the top navigation", () => {
		renderShell();
		const header = screen.getByRole("banner");
		expect(within(header).queryByText("Ask your family")).not.toBeInTheDocument();
		expect(header.querySelector("details")).not.toBeInTheDocument();
	});

	it("keeps only products and the counted draft list in one navigation row", () => {
		renderShell(<><h1>Start shopping</h1><AddProduct /></>);
		const navigation = within(screen.getByRole("navigation", { name: devicesCopy.shopNav }));
		expect(navigation.getByRole("link", { name: devicesCopy.shopProducts })).toHaveAttribute("href", "/shop/products");
		expect(navigation.getByRole("link", { name: `${devicesCopy.shopList}, ${devicesCopy.shopListCount(0)}` }))
			.toHaveAttribute("href", "/shop/basket");
		expect(navigation.queryByRole("link", { name: devicesCopy.shopHome })).not.toBeInTheDocument();
		expect(navigation.getAllByRole("link")).toHaveLength(2);
		fireEvent.click(screen.getByRole("button", { name: "Add product" }));
		expect(navigation.getByRole("link", { name: `${devicesCopy.shopList}, ${devicesCopy.shopListCount(1)}` }))
			.toBeInTheDocument();
		expect(within(screen.getByRole("main")).queryByRole("navigation")).not.toBeInTheDocument();
	});

	it("keeps compact mobile header controls on one line", () => {
		const shell = readFileSync(resolve("src/features/devices/components/ShopShell/ShopShell.module.css"), "utf8");
		const navigation = readFileSync(resolve("src/features/devices/components/ShopNavigation/ShopNavigation.module.css"), "utf8");
		expect(shell).toMatch(/\.headerInner\s*\{[^}]*flex-wrap: nowrap;/);
		expect(navigation).toMatch(/\.navigation\s*\{[^}]*white-space: nowrap;/);
	});

	it.each(["Assistant", "Products", "My List", "Requests"])("omits the shared footer on the %s page", (title) => {
		renderShell(<h1>{title}</h1>);
		expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
		expect(screen.queryByText("This is a demo. No real orders or deliveries.")).not.toBeInTheDocument();
		expect(within(screen.getByRole("main")).getByRole("heading", { name: title })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /sign in|pay|checkout/i })).not.toBeInTheDocument();
		expect(screen.getAllByRole("banner")).toHaveLength(1);
	});
});
