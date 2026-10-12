import { Suspense, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { devicesCopy } from "@/features/devices/copy";

const mocks = vi.hoisted(() => ({ device: vi.fn(), list: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: mocks.device }));
vi.mock("@/features/catalog/server/service", () => ({ listRequesterProducts: mocks.list }));
import ProductsPage from "./page";
import { AppError } from "@/server/errors";

async function content(searchParams = Promise.resolve({})) {
	const boundary = ProductsPage({ searchParams }) as ReactElement<{ children: ReactElement<{ searchParams: typeof searchParams }> }>;
	const element = boundary.props.children;
	return (element.type as (props: typeof element.props) => Promise<ReactElement>)(element.props);
}

describe("protected requester catalog entry", () => {
	it("keeps device reads inside the streamed content", () => {
		mocks.device.mockClear();
		const boundary = ProductsPage({ searchParams: Promise.resolve({}) });
		expect(boundary.type).toBe(Suspense);
		expect(boundary.props.fallback).toBeDefined();
		expect(mocks.device).not.toHaveBeenCalled();
	});
	it.each(["missing", "revoked", "expired"])("shows reconnect for a %s session without reading the catalog", async () => {
		mocks.list.mockClear();
		mocks.device.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		render(await content());
		expect(screen.getByRole("heading", { level: 1, name: devicesCopy.reconnect })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: devicesCopy.reconnectAction })).toHaveAttribute("href", "/connect");
		expect(mocks.list).not.toHaveBeenCalled();
	});
	it("resolves the device before reading URL filters and catalog data", async () => {
		const actor = { type: "device", familyId: "family", profileId: "profile", deviceId: "device", profileKind: "ASSISTED_ADULT" };
		mocks.device.mockResolvedValue(actor);
		mocks.list.mockResolvedValue({ products: [], nextCursor: null });
		await content(Promise.resolve({ category: "PANTRY", q: "rice" }));
		expect(mocks.list).toHaveBeenLastCalledWith(actor, { category: "PANTRY", q: "rice", limit: 12 });
	});
});
