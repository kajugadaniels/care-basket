import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { privacyCopy as copy } from "@/features/privacy/copy";
import PrivacyPage, { metadata } from "./page";

describe("public privacy page", () => {
	it("renders without authentication, with one h1, metadata, skip link and public contact", () => {
		render(<PrivacyPage />);
		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(copy.title);
		expect(metadata).toEqual({ title: copy.title, description: copy.description });
		expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main-content");
		expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
		expect(screen.getByRole("link", { name: copy.email })).toHaveAttribute("href", `mailto:${copy.email}`);
		expect(screen.getByRole("link", { name: copy.home })).toHaveAttribute("href", "/");
	});
	it("explains current gates and manual retention without inventing deletion guarantees", () => {
		render(<PrivacyPage />);
		const main = screen.getByRole("main");
		expect(main).toHaveTextContent("Gemini processing and voice interpretation are currently disabled");
		expect(main).toHaveTextContent("for adults aged 18 or older");
		expect(main).toHaveTextContent("We do not collect birth dates or verify ages");
		expect(main).toHaveTextContent("not automatically converted into adult profiles or erased");
		expect(main).toHaveTextContent("developer-run maintenance, not an automatic scheduled service");
		expect(main).toHaveTextContent("30 minutes");
		expect(main).toHaveTextContent("90 days");
		expect(main).toHaveTextContent("180 days");
		expect(main).toHaveTextContent("not available as a self-service screen");
		expect(main).toHaveTextContent("does not erase every backup immediately");
		expect(within(main).queryByRole("button")).not.toBeInTheDocument();
		for (const section of copy.sections) {
			expect(within(main).getByRole("region", { name: section.title })).toBeInTheDocument();
		}
	});
	it("keeps reading text, long addresses and retention rows fluid", () => {
		const css = readFileSync(new URL("./page.module.css", import.meta.url), "utf8");
		expect(css).toContain("font-size: var(--text-base)");
		expect(css).toContain("overflow-wrap: anywhere");
		expect(css).toContain("min-block-size: var(--control-height)");
		expect(css).not.toMatch(/height:\s*\d+px/);
	});
});
