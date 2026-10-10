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
		expect(screen.getByRole("link", { name: devicesCopy.shopHome })).toHaveAttribute("href", "/shop");
		expect(screen.getByText(devicesCopy.askFamily).closest("summary")).toBeInTheDocument();
		expect(screen.getByText(devicesCopy.shopHelp).closest("details")).not.toHaveAttribute("open");
		expect(screen.getByRole("link", { name: devicesCopy.skipShopping })).toHaveAttribute("href", "#shop-main");
	});

	it("shows truthful demo information without account or payment controls", () => {
		render(<ShopShell><p>Groceries</p></ShopShell>);
		expect(screen.getByRole("contentinfo")).toHaveTextContent(devicesCopy.shopDemo);
		expect(screen.queryByRole("button", { name: /sign in|pay|checkout/i })).not.toBeInTheDocument();
		expect(screen.getAllByRole("banner")).toHaveLength(1);
	});
});
