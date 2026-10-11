import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/types/action-result";
import { LoadMore } from "./LoadMore";
import { usePagedList } from "./use-paged-list";

type Item = { sku: string };
type Result = ActionResult<{ items: Item[]; nextCursor: string | null }>;
const labels = { more: "Load more", loading: "Loading more", retry: "Retry", error: "Please try again", end: "All shown" };
const fetchPage = vi.fn<(cursor: string) => Promise<Result>>();

function List() {
	const feed = usePagedList({ items: [{ sku: "first" }], nextCursor: "second" as string | null }, fetchPage);
	return <>
		<ul>{feed.items.map((item) => <li key={item.sku}>{item.sku}</li>)}</ul>
		<LoadMore {...feed} labels={labels} onLoad={feed.loadMore} />
	</>;
}

describe("progressive product loading", () => {
	const observers: IntersectionObserverCallback[] = [];
	beforeEach(() => {
		fetchPage.mockReset(); observers.length = 0;
		fetchPage.mockResolvedValue({ ok: true, data: { items: [{ sku: "second" }], nextCursor: null } });
		vi.stubGlobal("IntersectionObserver", class {
			constructor(callback: IntersectionObserverCallback) { observers.push(callback); }
			observe = vi.fn();
			disconnect = vi.fn();
		});
	});
	afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
	function nearEnd() {
		act(() => observers.at(-1)!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
	}

	it("loads near the bottom, deduplicates cards, and stops at exhaustion", async () => {
		fetchPage.mockResolvedValue({ ok: true, data: { items: [{ sku: "first" }, { sku: "second" }, { sku: "second" }], nextCursor: null } });
		render(<List />);
		nearEnd();
		await screen.findByText("second");
		expect(screen.getAllByRole("listitem")).toHaveLength(2);
		expect(screen.getByRole("status")).toHaveTextContent(labels.end);
		expect(screen.getByRole("button", { name: labels.more })).toBeDisabled();
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("prevents concurrent observer and button requests", async () => {
		let finish!: (result: Result) => void;
		fetchPage.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
		render(<List />);
		nearEnd(); nearEnd();
		fireEvent.click(screen.getByRole("button", { name: labels.more }));
		expect(fetchPage).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("status")).toHaveTextContent(labels.loading);
		await act(async () => finish({ ok: true, data: { items: [], nextCursor: null } }));
	});

	it("requires explicit retry after failure and keeps previously loaded cards", async () => {
		fetchPage.mockRejectedValueOnce(new Error("offline"));
		render(<List />);
		nearEnd();
		await screen.findByRole("alert");
		expect(screen.getByText("first")).toBeInTheDocument();
		nearEnd();
		expect(fetchPage).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getByRole("button", { name: labels.retry }));
		await screen.findByText("second");
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});

	it("supports manual loading when IntersectionObserver is unavailable", async () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		render(<List />);
		fireEvent.click(screen.getByRole("button", { name: labels.more }));
		await screen.findByText("second");
	});

	it("does not automatically load while hidden", () => {
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
		render(<List />);
		nearEnd();
		expect(fetchPage).not.toHaveBeenCalled();
	});

	it("terminates a repeated cursor rather than requesting forever", async () => {
		fetchPage.mockResolvedValue({ ok: true, data: { items: [], nextCursor: "second" } });
		render(<List />);
		nearEnd();
		await waitFor(() => expect(screen.getByRole("button", { name: labels.more })).toBeDisabled());
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("discards late responses after the feed unmounts", async () => {
		let finish!: (result: Result) => void;
		fetchPage.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
		const { unmount } = render(<List />);
		nearEnd(); unmount();
		await act(async () => finish({ ok: true, data: { items: [{ sku: "late" }], nextCursor: null } }));
		expect(screen.queryByText("late")).not.toBeInTheDocument();
	});
});
