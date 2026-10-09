import { cx } from "@/lib/class-names";
import styles from "./Spinner.module.css";

// Decorative: the text beside it, or the busy state of its control, announces the progress.
export function Spinner({ className }: { className?: string }) {
	return <span className={cx(styles.spinner, className)} aria-hidden="true" />;
}
