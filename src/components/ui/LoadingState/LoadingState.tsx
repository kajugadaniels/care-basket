import type { ReactNode } from "react";
import styles from "./LoadingState.module.css";

type LoadingStateProps = {
	// Read by screen readers in place of the decorative placeholders.
	label: string;
	// Skeletons arranged in the final layout of the content that is loading.
	children: ReactNode;
	className?: string;
};

// Wraps the placeholders for one region of a page that is still loading, so the static parts
// around it stay visible and usable. Not aria-busy: that would silence the status announcement.
export function LoadingState({ label, children, className }: LoadingStateProps) {
	return (
		<div role="status" className={className}>
			<span className={styles.visuallyHidden}>{label}</span>
			{children}
		</div>
	);
}
