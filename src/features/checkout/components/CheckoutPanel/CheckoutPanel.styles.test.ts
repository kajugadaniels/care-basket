// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("checkout reading and reflow safeguards", () => {
	it("keeps explanatory and recovery text at manager body size", () => {
		const css = readFileSync(new URL("./CheckoutPanel.module.css", import.meta.url), "utf8");
		expect(css).toMatch(/\.help\s*\{[^}]*font-size:\s*var\(--text-base\)/);
		expect(css).toMatch(/\.error\s*\{[^}]*font-size:\s*var\(--text-base\)/);
		expect(css).toContain("overflow-wrap: anywhere");
		expect(css).toContain("max-block-size: calc(100dvh");
	});
});
