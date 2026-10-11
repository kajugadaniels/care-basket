"use client";

import { CancelCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import styles from "./Toast.module.css";

export type ToastNotice = { id: number; message: string };

type ToastProps = {
	notice: ToastNotice | null;
	dismissLabel: string;
	onDismiss: () => void;
};

// The live region stays mounted, including between identical repeat successes.
// Routine confirmations stay until dismissed; errors and payment outcomes belong inline.
export function Toast({ notice, dismissLabel, onDismiss }: ToastProps) {
	const container = useRef<HTMLDivElement>(null);
	const returnFocus = useRef<HTMLElement | null>(null);
	const noticeId = notice?.id;

	useEffect(() => {
		if (noticeId == null) return;
		const toast = container.current;
		if (!toast) return;
		toast.dataset.position = "bottom";
		const active = document.activeElement;
		if (active instanceof HTMLElement && !toast.contains(active)) returnFocus.current = active;

		// Move the notice instead of moving the person's focus. Very short viewports
		// use an in-flow fallback when neither corner leaves the focused control clear.
		function keepFocusVisible() {
			const toast = container.current;
			const focused = document.activeElement;
			if (!toast || !(focused instanceof HTMLElement) || focused === document.body || focused === document.documentElement || toast.contains(focused)) return;
			const target = focused.getBoundingClientRect();
			for (const position of ["bottom", "top", "flow"]) {
				toast.dataset.position = position;
				const bounds = toast.getBoundingClientRect();
				if (bounds.bottom <= target.top || bounds.top >= target.bottom || bounds.right <= target.left || bounds.left >= target.right) break;
			}
		}

		keepFocusVisible();
		document.addEventListener("focusin", keepFocusVisible);
		window.addEventListener("resize", keepFocusVisible);
		window.addEventListener("scroll", keepFocusVisible, { passive: true });
		return () => {
			document.removeEventListener("focusin", keepFocusVisible);
			window.removeEventListener("resize", keepFocusVisible);
			window.removeEventListener("scroll", keepFocusVisible);
		};
	}, [noticeId]);

	return (
		<div ref={container} className={notice ? styles.toast : styles.visuallyHidden}>
			{notice ? <Icon icon={CheckmarkCircle02Icon} size={24} className={styles.icon} /> : null}
			<p role="status" aria-live="polite" aria-atomic="true" className={styles.message}>
				{notice ? <span key={notice.id}>{notice.message}</span> : null}
			</p>
			{notice ? (
				<Button size="xs" icon={CancelCircleIcon} variant="secondary" onClick={() => {
					onDismiss();
					if (returnFocus.current?.isConnected) returnFocus.current.focus();
				}}>
					{dismissLabel}
				</Button>
			) : null}
		</div>
	);
}
