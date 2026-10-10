import { describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: fake.redirect }));

import ShopPage from "./page";

describe("shop entry", () => {
	it("replaces the old welcome page with a fixed assistant redirect", () => {
		const redirect = new Error("NEXT_REDIRECT");
		fake.redirect.mockImplementation(() => { throw redirect; });
		expect(() => ShopPage()).toThrow(redirect);
		expect(fake.redirect).toHaveBeenCalledExactlyOnceWith("/shop/assistant");
	});
});
