import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cx } from "@/lib/class-names";
import { catalogCopy } from "../../copy";
import toolbarStyles from "../ManagerCatalog/ManagerCatalog.module.css";
import styles from "./CatalogBrowser.module.css";

// Mirror the shared toolbar and price-free cards, without focusable loading controls.
export function CatalogSkeleton() {
	return (
		<LoadingState label={catalogCopy.loading} className={cx(styles.page, styles.requester)}>
			<div className={styles.header} aria-hidden="true">
				<div className={styles.heading}>
					<Skeleton shape="heading" className={styles.headingSkeleton} />
					<Skeleton />
				</div>
				<Skeleton shape="pill" className={styles.homeSkeleton} />
			</div>
			<div className={cx(toolbarStyles.toolbar, toolbarStyles.requesterToolbar)} aria-hidden="true">
				<div className={toolbarStyles.field}>
					<p className={toolbarStyles.label}>{catalogCopy.searchLabel}</p>
					<div className={cx(toolbarStyles.input, toolbarStyles.inputSkeleton)} />
				</div>
				<div className={toolbarStyles.field}>
					<p className={toolbarStyles.label}>{catalogCopy.categoryLabel}</p>
					<div className={cx(toolbarStyles.input, toolbarStyles.inputSkeleton)}>
						<Skeleton className={toolbarStyles.selectValueSkeleton} />
					</div>
				</div>
				<Skeleton shape="pill" className={toolbarStyles.submitSkeleton} />
			</div>
			<div className={styles.resultsBar} aria-hidden="true">
				<Skeleton className={styles.resultsSkeleton} />
			</div>
			<ul className={styles.grid} aria-hidden="true">
				{Array.from({ length: 8 }, (_, index) => (
					<li key={index} className={styles.cardSkeleton}>
						<Skeleton shape="box" className={styles.pictureSkeleton} />
						<div className={styles.cardBodySkeleton}><Skeleton shape="heading" /><Skeleton /></div>
					</li>
				))}
			</ul>
		</LoadingState>
	);
}
