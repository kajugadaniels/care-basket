"use client";

import { useEffect, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";

function subscribeToMotionPreference(notify: () => void) {
	const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
	preference?.addEventListener("change", notify);
	return () => preference?.removeEventListener("change", notify);
}

function prefersReducedMotion() {
	return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function useLandingPlayback(
	current: number,
	setCurrent: Dispatch<SetStateAction<number>>,
	slideCount: number,
) {
	const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, () => true);
	const [paused, setPaused] = useState(false);
	const [hovered, setHovered] = useState(false);
	const playing = !paused && !hovered && !reducedMotion;

	useEffect(() => {
		if (!playing) return;
		let timer: ReturnType<typeof setTimeout> | undefined;

		// Start a fresh reading interval after returning to the tab or navigating manually.
		function schedule() {
			clearTimeout(timer);
			if (document.visibilityState === "hidden") return;
			timer = setTimeout(() => setCurrent((index) => (index + 1) % slideCount), 8_000);
		}

		schedule();
		document.addEventListener("visibilitychange", schedule);
		return () => {
			clearTimeout(timer);
			document.removeEventListener("visibilitychange", schedule);
		};
	}, [current, playing, setCurrent, slideCount]);

	return { paused, playing, reducedMotion, setPaused, setHovered };
}
