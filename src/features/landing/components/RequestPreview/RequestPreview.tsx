import { previewCopy } from "@/features/landing/copy";
import styles from "./RequestPreview.module.css";

// Fictional example copy, never an actual request or a payment confirmation.
export function RequestPreview() {
	return (
		<figure className={styles.preview}>
			<p className={styles.label}>{previewCopy.requestLabel}</p>
			<blockquote className={styles.quote}>
				<p>&ldquo;{previewCopy.request}&rdquo;</p>
			</blockquote>
			<p className={styles.status}>{previewCopy.status}</p>
			<figcaption className={styles.caption}>{previewCopy.caption}</figcaption>
		</figure>
	);
}
