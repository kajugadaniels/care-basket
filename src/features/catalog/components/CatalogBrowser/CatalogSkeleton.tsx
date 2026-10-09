import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cx } from "@/lib/class-names";
import { catalogCopy } from "../../copy";
import styles from "./CatalogBrowser.module.css";

// The requester browser's loading state. The manager catalog uses ManagerCatalogSkeleton.
export function CatalogSkeleton() {
	return (
		<div className={cx(styles.page, styles.requester)} aria-busy="true">
			<p role="status">{catalogCopy.loading}</p>
			<div className={styles.header}><Skeleton shape="heading" /><Skeleton /><Skeleton shape="pill" /></div>
			<div className={styles.filters}><Skeleton shape="box" /><Skeleton shape="pill" /><Skeleton shape="box" /></div>
			<ul className={styles.grid} aria-hidden="true">
				{Array.from({ length: 8 }, (_, index) => (
					<li key={index} className={styles.cardSkeleton}>
						<Skeleton shape="box" className={styles.pictureSkeleton} /><Skeleton /><Skeleton />
					</li>
				))}
			</ul>
		</div>
	);
}
