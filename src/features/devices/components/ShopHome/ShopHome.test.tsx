import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShopHome } from "./ShopHome";
describe("restricted shopping home", () => {
  it("greets the assigned person without payment controls or pretend shopping actions", () => {
    render(<ShopHome profile={{ displayName: "Rose", avatarKey: "flower" }} />);
    expect(screen.getByRole("heading", { name: "Hello, Rose!" })).toBeInTheDocument();
    expect(screen.getByText(/review every shopping request/)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
		expect(screen.getByRole("link", { name: "Start my shopping list" })).toHaveAttribute("href", "/shop/assistant");
		expect(screen.getByRole("link", { name: "Look at Groceries" })).toHaveAttribute("href", "/shop/products");
  });
  it("shows only a reconnect action without leaking the previous profile", () => {
    render(<ShopHome profile={null} />);
    expect(screen.getByRole("link", { name: "Connect Again" })).toHaveAttribute("href", "/connect");
    expect(screen.queryByText("Rose")).not.toBeInTheDocument();
  });
});
