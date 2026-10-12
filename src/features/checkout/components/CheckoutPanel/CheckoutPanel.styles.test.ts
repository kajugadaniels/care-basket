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
	it("keeps receipt result animations brief, distinct, and reduced-motion safe", () => {
		const css = readFileSync(new URL("./CheckoutPanel.module.css", import.meta.url), "utf8");
		expect(css).toContain("animation-name: receiptAccepted");
		expect(css).toContain("animation-name: receiptReturned");
		expect(css).toContain("animation-duration: var(--duration-base)");
		expect(css).toContain("@media (prefers-reduced-motion: reduce)");
		expect(css).toMatch(/\.receipt,\s*\.seal,\s*\.errorIcon\s*\{\s*animation: none/);
		expect(css).toContain("@media (forced-colors: active)");
		expect(css).not.toMatch(/animation[^;]*infinite/);
	});
	it("reflows the dedicated order summary before splitting into desktop columns", () => {
		const css = readFileSync(new URL("../CheckoutScreen/CheckoutScreen.module.css", import.meta.url), "utf8");
		expect(css).toContain("min-inline-size: 0");
		expect(css).toContain("flex-wrap: wrap");
		expect(css).toContain("@media (min-width: 48rem)");
		expect(css).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)");
	});
});
