import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cx } from "@/lib/class-names";
import styles from "./TextField.module.css";

type TextFieldSkeletonProps = {
	label: string;
	hint?: string;
	// Adds a placeholder bar for a saved value that is still loading.
	// Without it, the frame matches an empty input.
	withValue?: boolean;
	className?: string;
};

// The field's real label and hint around an input frame, so the form keeps its final layout.
export function TextFieldSkeleton({ label, hint, withValue = false, className }: TextFieldSkeletonProps) {
	return (
		<div className={cx(styles.field, className)} aria-hidden="true">
			<p className={styles.label}>{label}</p>
			{hint ? <p className={styles.hint}>{hint}</p> : null}
			<div className={cx(styles.input, styles.inputSkeleton)}>
				{withValue ? <Skeleton className={styles.valueSkeleton} /> : null}
			</div>
		</div>
	);
}
