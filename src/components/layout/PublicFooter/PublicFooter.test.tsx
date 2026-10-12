import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicFooter } from "./PublicFooter";

describe("public footer", () => {
	it("links to privacy and attribution while accurately qualifying Sandbox payments", () => {
		render(<PublicFooter />);
		const footer = screen.getByRole("contentinfo");
		expect(within(footer).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
		expect(within(footer).getByRole("link", { name: "Data sources" })).toHaveAttribute("href", "/data-sources");
		expect(footer).toHaveTextContent("disabled by default until controlled verification");
		expect(footer).toHaveTextContent("no real money moves");
		expect(footer).toHaveTextContent("not affiliated with or endorsed by PayPal");
		expect(footer).toHaveTextContent("no real grocery orders or deliveries");
		expect(footer).not.toHaveTextContent("When payments are added");
	});
	it("uses body-sized disclosure text and wraps long content", () => {
		const css = readFileSync(new URL("./PublicFooter.module.css", import.meta.url), "utf8");
		expect(css).toMatch(/\.disclosure\s*\{[^}]*font-size:\s*var\(--text-base\)/);
		expect(css).toContain("overflow-wrap: anywhere");
	});
});
