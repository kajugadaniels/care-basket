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
	labels: { more: string; loading: string; retry: string; error: string; end: string };
};

export function LoadMore({ hasMore, pending, failed, onLoad, labels }: Props) {
	const sentinel = useRef<HTMLDivElement>(null);
	const requestMore = useEffectEvent(onLoad);

	useEffect(() => {
		const target = sentinel.current;
		if (!target || !hasMore || pending || failed || typeof IntersectionObserver === "undefined") return;
		let active = true;
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
		<div className={styles.loadMore} ref={sentinel}>
			{failed ? <p role="alert" className={styles.error}>{labels.error}</p> : null}
			<p role="status" aria-live="polite" aria-atomic="true" className={styles.status}>
				{pending ? <><Spinner />{labels.loading}</> : !hasMore ? labels.end : null}
			</p>
			<Button size="lg" variant="secondary" disabled={pending || !hasMore} onClick={onLoad}>
				{failed ? labels.retry : labels.more}
			</Button>
		</div>
	);
}
