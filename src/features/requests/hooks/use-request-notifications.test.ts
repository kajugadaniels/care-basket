import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds } from "@/test/factories/requests";
import type { RequestNotificationsDto } from "../types";
import { useRequestNotifications } from "./use-request-notifications";

const fake = vi.hoisted(() => ({ load: vi.fn() }));
const empty: RequestNotificationsDto = { count: 0, notifications: [] };
const incoming: RequestNotificationsDto = {
	count: 1,
	notifications: [{ id: requestIds.request, displayName: "Rose", submittedAt: "2026-10-12T12:00:00Z" }],
};
function respond(data: RequestNotificationsDto) {
	fake.load.mockImplementation(async () => Response.json({ data }));
}
function waitUntilAborted() {
	fake.load.mockImplementation((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
		options.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
	}));
}

describe("manager request notification polling", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.resetAllMocks();
		vi.stubGlobal("fetch", fake.load);
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
		respond(empty);
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("uses server data immediately and polls for committed submissions every 20 seconds", async () => {
		respond(incoming);
		const { result } = renderHook(() => useRequestNotifications(empty));
		expect(result.current.data).toEqual(empty);
		expect(fake.load).not.toHaveBeenCalled();
		await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
		expect(result.current.data).toEqual(incoming);
		expect(result.current.announcement).toBe("Rose has sent a shopping list.");
		expect(fake.load).toHaveBeenCalledWith("/api/requests/notifications", {
			cache: "no-store", credentials: "same-origin", redirect: "error", signal: expect.any(AbortSignal),
		});
		await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
		expect(fake.load).toHaveBeenCalledTimes(2);
		expect(result.current.data?.notifications).toHaveLength(1);
	});

	it("pauses hidden-tab reads and refreshes immediately on visibility and focus", async () => {
		renderHook(() => useRequestNotifications(empty));
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
			window.dispatchEvent(new Event("focus"));
			await vi.advanceTimersByTimeAsync(40_000);
		});
		expect(fake.load).not.toHaveBeenCalled();
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
		await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
		expect(fake.load).toHaveBeenCalledTimes(1);
		await act(async () => { window.dispatchEvent(new Event("focus")); });
		expect(fake.load).toHaveBeenCalledTimes(2);
	});

	it("does not overlap focus, opening, or retry reads", async () => {
		let resolve!: (response: Response) => void;
		fake.load.mockImplementation(() => new Promise<Response>((done) => { resolve = done; }));
		const { result } = renderHook(() => useRequestNotifications(empty));
		act(() => { void result.current.refresh(); });
		await act(async () => {
			window.dispatchEvent(new Event("focus"));
			void result.current.refresh();
			await vi.advanceTimersByTimeAsync(1_000);
		});
		expect(fake.load).toHaveBeenCalledTimes(1);
		expect(result.current.pending).toBe(true);
		await act(async () => { resolve(Response.json({ data: incoming })); });
		expect(result.current.pending).toBe(false);
		expect(result.current.data).toEqual(incoming);
	});

	it.each(["response", "transport", "schema"])("keeps the last count after a %s failure and supports retry", async (failure) => {
		if (failure === "response") fake.load.mockImplementation(async () => Response.json({}, { status: 500 }));
		else if (failure === "schema") fake.load.mockImplementation(async () => Response.json({ data: { count: -1 } }));
		else fake.load.mockRejectedValue(new Error("Offline"));
		const { result } = renderHook(() => useRequestNotifications(incoming));
		await act(async () => { await result.current.refresh(); });
		expect(result.current.failed).toBe(true);
		expect(result.current.data).toEqual(incoming);
		respond(empty);
		await act(async () => { await result.current.refresh(); });
		expect(result.current.failed).toBe(false);
		expect(result.current.data).toEqual(empty);
	});

	it.each([401, 403])("clears private notifications and stops polling after HTTP %s", async (status) => {
		fake.load.mockImplementation(async () => Response.json({}, { status }));
		const { result } = renderHook(() => useRequestNotifications(incoming));
		await act(async () => { await result.current.refresh(); });
		expect(result.current.failed).toBe(true);
		expect(result.current.accessLost).toBe(true);
		expect(result.current.data).toBeNull();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(40_000);
			window.dispatchEvent(new Event("focus"));
		});
		expect(fake.load).toHaveBeenCalledTimes(1);
	});

	it("aborts a slow request after ten seconds and permits retry", async () => {
		waitUntilAborted();
		const { result } = renderHook(() => useRequestNotifications(empty));
		act(() => { void result.current.refresh(); });
		await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
		expect(fake.load.mock.calls[0][1].signal.aborted).toBe(true);
		expect(result.current.pending).toBe(false);
		expect(result.current.failed).toBe(true);
		respond(incoming);
		await act(async () => { await result.current.refresh(); });
		expect(result.current.data).toEqual(incoming);
	});

	it("cancels an in-flight request when hidden without reporting a failure", async () => {
		waitUntilAborted();
		const { result } = renderHook(() => useRequestNotifications(empty));
		act(() => { void result.current.refresh(); });
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
		await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
		expect(fake.load.mock.calls[0][1].signal.aborted).toBe(true);
		expect(result.current.failed).toBe(false);
		expect(result.current.pending).toBe(false);
	});

	it("recovers from an initial server failure without inventing a zero count", async () => {
		const { result } = renderHook(() => useRequestNotifications(null));
		expect(result.current.data).toBeNull();
		expect(result.current.failed).toBe(true);
		respond(incoming);
		await act(async () => { await result.current.refresh(); });
		expect(result.current.data).toEqual(incoming);
		expect(result.current.failed).toBe(false);
	});

	it("cleans up polling, aborts the read and ignores responses after unmount", async () => {
		let resolve!: (response: Response) => void;
		fake.load.mockImplementation(() => new Promise<Response>((done) => { resolve = done; }));
		const { result, unmount } = renderHook(() => useRequestNotifications(empty));
		act(() => { void result.current.refresh(); });
		unmount();
		expect(fake.load.mock.calls[0][1].signal.aborted).toBe(true);
		await act(async () => {
			resolve(Response.json({ data: incoming }));
			window.dispatchEvent(new Event("focus"));
			await vi.advanceTimersByTimeAsync(60_000);
		});
		expect(fake.load).toHaveBeenCalledTimes(1);
	});
});
