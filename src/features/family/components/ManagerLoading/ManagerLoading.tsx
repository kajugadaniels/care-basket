import { Spinner } from "@/components/ui/Spinner/Spinner";
import { familyLayoutCopy } from "../../copy";
import styles from "./ManagerLoading.module.css";

// A content-region fallback: resolved navigation stays usable, with no private data here.
export function ManagerLoading() {
	return (
		<div role="status" aria-live="polite" aria-atomic="true" className={styles.loading}>
			<Spinner className={styles.spinner} />
			<div className={styles.message}>
				<p className={styles.title}>{familyLayoutCopy.loading}</p>
				<p className={styles.help}>{familyLayoutCopy.loadingHelp}</p>
			</div>
		</div>
	);
}
