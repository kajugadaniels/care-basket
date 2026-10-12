import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicFooter } from "./PublicFooter";

describe("public footer", () => {
	it("links to privacy and attribution while accurately qualifying Sandbox payments", () => {
		render(<PublicFooter />);
		const footer = screen.getByRole("contentinfo");
		expect(within(footer).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
		expect(within(footer).getByRole("link", { name: "Data sources" })).toHaveAttribute("href", "/data-sources");
		expect(footer).toHaveTextContent("Sandbox-only payments");
		expect(footer).toHaveTextContent("For adults aged 18 or older.");
		expect(footer).toHaveTextContent("simulated merchant and prices");
		expect(footer).toHaveTextContent("no real money, orders or deliveries");
		expect(footer).toHaveTextContent("not affiliated with or endorsed by PayPal");
		expect(footer).not.toHaveTextContent("When payments are added");
	});
	it("keeps only the brand, description and two labelled navigation links", () => {
		render(<PublicFooter />);
		const footer = screen.getByRole("contentinfo");
		const navigation = within(footer).getByRole("navigation", { name: "Footer links" });
		const links = within(footer).getAllByRole("link");
		expect(links.map((link) => link.textContent)).toEqual(["Data sources", "Privacy"]);
		expect(within(navigation).getAllByRole("listitem")).toHaveLength(2);
		expect(within(footer).getByText("CareBasket")).toBeInTheDocument();
		expect(footer.querySelectorAll("p")).toHaveLength(1);
		expect(within(footer).queryByRole("heading")).not.toBeInTheDocument();
		expect(within(footer).queryByRole("region")).not.toBeInTheDocument();
	});
	it("offers requester-friendly wording without payment jargon or smaller text", () => {
		render(<PublicFooter audience="requester" />);
		const footer = screen.getByRole("contentinfo");
		expect(footer).toHaveTextContent("Groceries made simple, with help from your family.");
		expect(footer).toHaveTextContent("For adults aged 18 or older.");
		expect(footer).toHaveTextContent("No real orders or deliveries.");
		expect(footer).not.toHaveTextContent("PayPal");
		expect(footer).not.toHaveTextContent("Sandbox");
		expect(within(footer).getAllByRole("link")).toHaveLength(2);
		const css = readFileSync(resolve(process.cwd(), "src/components/layout/PublicFooter/PublicFooter.module.css"), "utf8");
		expect(css).toMatch(/\.requester\s+\.description\s*\{[^}]*font-size:\s*var\(--text-lg\)/);
		expect(css).toMatch(/\.requester\s+\.link\s*\{[^}]*font-size:\s*var\(--text-md\)/);
	});
	it("uses body-sized text and keeps the links in a row within the responsive footer", () => {
		const css = readFileSync(resolve(process.cwd(), "src/components/layout/PublicFooter/PublicFooter.module.css"), "utf8");
		expect(css).toMatch(/\.description\s*\{[^}]*font-size:\s*var\(--text-base\)/);
		expect(css).toMatch(/\.links\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*nowrap/);
		expect(css).toMatch(/\.inner\s*\{[^}]*flex-direction:\s*column/);
		expect(css).toContain("flex-direction: row");
		expect(css).toContain("min-block-size: var(--control-height)");
		expect(css).toContain("overflow-wrap: anywhere");
		expect(css).not.toContain(".disclosure");
	});
});
