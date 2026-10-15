import { useState } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLandingPlayback } from "./use-landing-playback";

function useSlideshow() {
	const [current, setCurrent] = useState(0);
	return { current, setCurrent, ...useLandingPlayback(current, setCurrent, 4) };
}

describe("landing slideshow playback", () => {
	let reducedMotion: boolean;
	let media: EventTarget;

	beforeEach(() => {
		vi.useFakeTimers();
		reducedMotion = false;
		media = new EventTarget();
		Object.defineProperty(media, "matches", { get: () => reducedMotion });
		vi.stubGlobal("matchMedia", vi.fn(() => media));
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("advances after eight seconds and wraps back to the first slide", () => {
		const { result } = renderHook(useSlideshow);
		act(() => vi.advanceTimersByTime(7_999));
		expect(result.current.current).toBe(0);
		act(() => vi.advanceTimersByTime(1));
		expect(result.current.current).toBe(1);
		for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(8_000));
		expect(result.current.current).toBe(0);
	});

	it("stays paused until playback is explicitly resumed", () => {
		const { result } = renderHook(useSlideshow);
		act(() => result.current.setPaused(true));
		act(() => vi.advanceTimersByTime(32_000));
		expect(result.current.current).toBe(0);
		act(() => result.current.setPaused(false));
		act(() => vi.advanceTimersByTime(8_000));
		expect(result.current.current).toBe(1);
	});

	it("pauses on hover and gives a fresh reading interval on leave", () => {
		const { result } = renderHook(useSlideshow);
		act(() => vi.advanceTimersByTime(7_000));
		act(() => result.current.setHovered(true));
		act(() => vi.advanceTimersByTime(16_000));
		expect(result.current.current).toBe(0);
		act(() => result.current.setHovered(false));
		act(() => vi.advanceTimersByTime(7_999));
		expect(result.current.current).toBe(0);
		act(() => vi.advanceTimersByTime(1));
		expect(result.current.current).toBe(1);
	});

	it("does not advance in hidden tabs or catch up when the tab returns", () => {
		const { result } = renderHook(useSlideshow);
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
		act(() => document.dispatchEvent(new Event("visibilitychange")));
		act(() => vi.advanceTimersByTime(32_000));
		expect(result.current.current).toBe(0);
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
		act(() => document.dispatchEvent(new Event("visibilitychange")));
		act(() => vi.advanceTimersByTime(7_999));
		expect(result.current.current).toBe(0);
		act(() => vi.advanceTimersByTime(1));
		expect(result.current.current).toBe(1);
	});

	it("keeps playback manual when reduced motion is requested", () => {
		reducedMotion = true;
		const { result } = renderHook(useSlideshow);
		act(() => vi.advanceTimersByTime(32_000));
		expect(result.current.current).toBe(0);
		expect(result.current.reducedMotion).toBe(true);
		act(() => result.current.setCurrent(2));
		expect(result.current.current).toBe(2);
	});

	it("stops the timer when reduced motion changes and when unmounted", () => {
		const { result, unmount } = renderHook(useSlideshow);
		reducedMotion = true;
		act(() => media.dispatchEvent(new Event("change")));
		act(() => vi.advanceTimersByTime(16_000));
		expect(result.current.current).toBe(0);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});
