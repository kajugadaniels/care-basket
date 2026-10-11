import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftProvider } from "@/features/requests/components/DraftProvider/DraftProvider";
import { requestsCopy } from "@/features/requests/copy";
import type { CatalogProductDto } from "../../types";
import { RequesterProductFeed } from "./RequesterProductFeed";
import { CatalogBrowser } from "./CatalogBrowser";

const fake = vi.hoisted(() => ({ page: vi.fn() }));
vi.mock("../../actions", () => ({ loadRequesterProductsAction: fake.page }));
const rice: CatalogProductDto = { sku: "fictional-rice", displayName: "Rice", category: "PANTRY", sizeLabel: "1 lb", imagePath: null };
const beans: CatalogProductDto = { ...rice, sku: "fictional-beans", displayName: "Beans" };

describe("requester product feed", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.page.mockResolvedValue({ ok: true, data: { items: [rice, beans], nextCursor: null } });
	});
	it("preserves filters and quantity controls while appending unique products", async () => {
		render(<DraftProvider><RequesterProductFeed selectable filters={{ q: "rice", category: "PANTRY", limit: 12 }}
			initial={{ products: [rice], nextCursor: "next" }} /></DraftProvider>);
		const controls = within(screen.getByRole("article", { name: "Rice" }).parentElement!);
		fireEvent.click(controls.getByRole("button", { name: requestsCopy.increase("Rice") }));
		fireEvent.click(controls.getByRole("button", { name: requestsCopy.add }));
		fireEvent.click(screen.getByRole("button", { name: "Load more groceries" }));
		await screen.findByRole("article", { name: "Beans" });
		expect(fake.page).toHaveBeenCalledWith({ q: "rice", category: "PANTRY", cursor: "next" });
		expect(screen.getAllByRole("article", { name: "Rice" })).toHaveLength(1);
		expect(controls.getByText("Quantity: 2")).toBeInTheDocument();
		expect(controls.queryByRole("button", { name: requestsCopy.add })).not.toBeInTheDocument();
		expect(screen.queryByText("Demo price")).not.toBeInTheDocument();
	});

	it("resets visible results when search filters change", () => {
		const { rerender } = render(<CatalogBrowser filters={{ q: "rice", limit: 12 }} result={{ products: [rice], nextCursor: "next" }} />);
		rerender(<CatalogBrowser filters={{ q: "beans", limit: 12 }} result={{ products: [beans], nextCursor: null }} />);
		expect(screen.getByRole("article", { name: "Beans" })).toBeInTheDocument();
		expect(screen.queryByRole("article", { name: "Rice" })).not.toBeInTheDocument();
	});

	it("keeps products visible on failure and allows retry", async () => {
		fake.page.mockResolvedValueOnce({ ok: false, error: { code: "INTERNAL", message: "safe error" } });
		render(<RequesterProductFeed selectable={false} filters={{ q: "", limit: 12 }} initial={{ products: [rice], nextCursor: "next" }} />);
		fireEvent.click(screen.getByRole("button", { name: "Load more groceries" }));
		await screen.findByRole("alert");
		expect(screen.getByRole("article", { name: "Rice" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Try loading again" }));
		await screen.findByRole("article", { name: "Beans" });
	});
});
