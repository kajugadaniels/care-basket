import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DeviceLayout from "./layout";

describe("device route-group layout", () => {
	it("preserves route content and appends one requester footer outside main", () => {
		render(<DeviceLayout><main><h1>Shopping</h1></main></DeviceLayout>);
		const main = screen.getByRole("main");
		const footer = screen.getByRole("contentinfo");
		expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
		expect(within(main).getByRole("heading", { level: 1, name: "Shopping" })).toBeInTheDocument();
		expect(main).not.toContainElement(footer);
		expect(main.nextElementSibling).toBe(footer);
		expect(footer).toHaveTextContent("This is a test app.");
		expect(footer).not.toHaveTextContent("PayPal");
		expect(within(footer).getByRole("link", { name: "Data sources" })).toHaveAttribute("href", "/data-sources");
		expect(within(footer).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
	});
});
