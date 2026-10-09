import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ adult: vi.fn(), list: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: mocks.adult }));
vi.mock("@/features/catalog/server/service", () => ({ listManagerProducts: mocks.list }));
import CatalogPage from "./page";

describe("protected manager catalog entry", () => {
	it("requires adult membership before returning demo-price data", async () => {
		const actor = { type: "adult", userId: "adult", familyId: "family", role: "OWNER" };
		mocks.adult.mockResolvedValue(actor);
		mocks.list.mockResolvedValue({ products: [], nextCursor: null });
		const searchParams = Promise.resolve({});
		const boundary = CatalogPage({ searchParams }) as ReactElement<{ children: ReactElement<{ searchParams: typeof searchParams }> }>;
		const element = boundary.props.children;
		await (element.type as (props: typeof element.props) => Promise<ReactElement>)(element.props);
		expect(mocks.adult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
		expect(mocks.list).toHaveBeenCalledWith(actor, { q: "", limit: 24 });
	});
	it("never reads catalog data after an adult authorization failure", async () => {
		mocks.list.mockClear();
		mocks.adult.mockRejectedValue(new Error("sign-in redirect"));
		const searchParams = Promise.resolve({});
		const boundary = CatalogPage({ searchParams }) as ReactElement<{ children: ReactElement<{ searchParams: typeof searchParams }> }>;
		const element = boundary.props.children;
		await expect((element.type as (props: typeof element.props) => Promise<ReactElement>)(element.props)).rejects.toThrow();
		expect(mocks.list).not.toHaveBeenCalled();
	});
});
