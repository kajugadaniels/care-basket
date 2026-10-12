import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ManagerLayout from "./layout";

describe("manager route-group layout", () => {
	it("preserves route content and appends one shared footer outside main", () => {
		render(<ManagerLayout><main><h1>Family</h1></main></ManagerLayout>);
		const main = screen.getByRole("main");
		const footer = screen.getByRole("contentinfo");
		expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
		expect(within(main).getByRole("heading", { level: 1, name: "Family" })).toBeInTheDocument();
		expect(main).not.toContainElement(footer);
		expect(main.nextElementSibling).toContainElement(footer);
		expect(footer).toHaveTextContent("Sandbox-only payments");
		expect(within(footer).getByRole("link", { name: "Data sources" })).toHaveAttribute("href", "/data-sources");
		expect(within(footer).getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
	});
	it("reserves mobile navigation clearance without an extra desktop gap", () => {
		const css = readFileSync(resolve(process.cwd(), "src/app/(manager)/layout.module.css"), "utf8");
		expect(css).toContain("env(safe-area-inset-bottom, 0px)");
		expect(css).toContain("var(--control-height-lg) + var(--space-5)");
		expect(css).toMatch(/@media\s*\(min-width:\s*64rem\)\s*\{\s*\.footer\s*\{\s*padding-block-end:\s*0/);
	});
});
