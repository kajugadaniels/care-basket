import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/types/action-result";
import { LoadMore } from "./LoadMore";
import { usePagedList } from "./use-paged-list";

type Item = { sku: string };
type Result = ActionResult<{ items: Item[]; nextCursor: string | null }>;
const labels = { automatic: "More groceries load automatically", loading: "Loading more", retry: "Retry", error: "Please try again", end: "All shown" };
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
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(screen.getByRole("region", { name: labels.automatic })).not.toHaveAttribute("tabindex");
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("prevents concurrent observer and keyboard requests", async () => {
		let finish!: (result: Result) => void;
		fetchPage.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
		render(<List />);
		nearEnd(); nearEnd();
		fireEvent.focus(screen.getByRole("region", { name: labels.automatic }));
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

	it("automatically loads without IntersectionObserver and removes fallback listeners", async () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const frames: FrameRequestCallback[] = [];
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
			frames.push(callback);
			return frames.length;
		});
		const remove = vi.spyOn(window, "removeEventListener");
		render(<List />);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(fetchPage).not.toHaveBeenCalled();
		act(() => frames.shift()!(0));
		await screen.findByText("second");
		expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
		expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
	});

	it("loads for keyboard users without adding a button or stealing focus", async () => {
		render(<List />);
		const boundary = screen.getByRole("region", { name: labels.automatic });
		expect(boundary).toHaveAttribute("tabindex", "0");
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		act(() => boundary.focus());
		await screen.findByText("second");
		expect(boundary).toHaveFocus();
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("waits until the fallback boundary is near the viewport and batches scroll checks", async () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const frames: FrameRequestCallback[] = [];
		const schedule = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
			frames.push(callback);
			return frames.length;
		});
		const bounds = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockReturnValue({ top: 2000, bottom: 2048 } as DOMRect);
		render(<List />);
		act(() => frames.shift()!(0));
		expect(fetchPage).not.toHaveBeenCalled();
		bounds.mockReturnValue({ top: 200, bottom: 248 } as DOMRect);
		fireEvent.scroll(window);
		fireEvent.scroll(window);
		expect(schedule).toHaveBeenCalledTimes(2);
		act(() => frames.shift()!(0));
		await screen.findByText("second");
		expect(fetchPage).toHaveBeenCalledTimes(1);
	});

	it("does not automatically load while hidden", () => {
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
		render(<List />);
		nearEnd();
		fireEvent.focus(screen.getByRole("region", { name: labels.automatic }));
		expect(fetchPage).not.toHaveBeenCalled();
	});

	it("pauses the scroll fallback while hidden and resumes when visible", async () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
		const frames: FrameRequestCallback[] = [];
		const schedule = vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
			frames.push(callback);
			return frames.length;
		});
		render(<List />);
		fireEvent.scroll(window);
		expect(schedule).not.toHaveBeenCalled();
		expect(fetchPage).not.toHaveBeenCalled();
		visibility.mockReturnValue("visible");
		fireEvent(document, new Event("visibilitychange"));
		act(() => frames.shift()!(0));
		await screen.findByText("second");
	});

	it("cancels a queued fallback check on unmount", () => {
		vi.stubGlobal("IntersectionObserver", undefined);
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
		const cancel = vi.spyOn(window, "cancelAnimationFrame");
		const { unmount } = render(<List />);
		unmount();
		expect(cancel).toHaveBeenCalledWith(42);
		expect(fetchPage).not.toHaveBeenCalled();
	});

	it("terminates a repeated cursor rather than requesting forever", async () => {
		fetchPage.mockResolvedValue({ ok: true, data: { items: [], nextCursor: "second" } });
		render(<List />);
		nearEnd();
		await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(labels.end));
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
