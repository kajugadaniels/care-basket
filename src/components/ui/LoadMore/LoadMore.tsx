"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import styles from "./LoadMore.module.css";

type Props = {
	hasMore: boolean;
	pending: boolean;
	failed: boolean;
	onLoad: () => void;
	labels: { automatic: string; loading: string; retry: string; error: string; end: string };
};

export function LoadMore({ hasMore, pending, failed, onLoad, labels }: Props) {
	const sentinel = useRef<HTMLDivElement>(null);
	const requestMore = useEffectEvent(onLoad);

	useEffect(() => {
		const target = sentinel.current;
		if (!target || !hasMore || pending || failed) return;
		let active = true;

		// Older browsers still load automatically, without a second navigation control.
		if (typeof IntersectionObserver === "undefined") {
			let frame: number | null = null;
			function checkPosition() {
				frame = null;
				if (!active || document.visibilityState === "hidden") return;
				const bounds = target!.getBoundingClientRect();
				if (bounds.top <= window.innerHeight + 400 && bounds.bottom >= -400) requestMore();
			}
			function scheduleCheck() {
				if (frame === null && document.visibilityState !== "hidden") {
					frame = window.requestAnimationFrame(checkPosition);
				}
			}
			scheduleCheck();
			window.addEventListener("scroll", scheduleCheck, { passive: true });
			window.addEventListener("resize", scheduleCheck);
			document.addEventListener("visibilitychange", scheduleCheck);
			return () => {
				active = false;
				if (frame !== null) window.cancelAnimationFrame(frame);
				window.removeEventListener("scroll", scheduleCheck);
				window.removeEventListener("resize", scheduleCheck);
				document.removeEventListener("visibilitychange", scheduleCheck);
			};
		}

		const observer = new IntersectionObserver((entries) => {
			if (active && document.visibilityState !== "hidden" && entries.some((entry) => entry.isIntersecting)) requestMore();
		}, { rootMargin: "400px 0px" });
		function observeWhenVisible() {
			observer.disconnect();
			if (document.visibilityState !== "hidden") observer.observe(target!);
		}
		observeWhenVisible();
		document.addEventListener("visibilitychange", observeWhenVisible);
		return () => {
			active = false;
			observer.disconnect();
			document.removeEventListener("visibilitychange", observeWhenVisible);
		};
	}, [hasMore, pending, failed]);

	return (
		<div
			className={styles.loadMore}
			ref={sentinel}
			role="region"
			aria-label={labels.automatic}
			tabIndex={hasMore && !failed ? 0 : undefined}
			onFocus={() => {
				// Keyboard users reach the same loading boundary as scrolling users.
				if (hasMore && !pending && !failed && document.visibilityState !== "hidden") onLoad();
			}}
		>
			{failed ? <p role="alert" className={styles.error}>{labels.error}</p> : null}
			<p role="status" aria-live="polite" aria-atomic="true" className={styles.status}>
				{pending ? <><Spinner />{labels.loading}</> : !hasMore ? labels.end : null}
			</p>
			{failed ? <Button size="lg" variant="secondary" disabled={pending} onClick={onLoad}>
				{labels.retry}
			</Button> : null}
		</div>
	);
}
