import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { assistantCopy as copy } from "../../copy";
import cardStyles from "@/features/requests/components/RequestUi/RequestUi.module.css";
import styles from "./ProposalReview.module.css";

export function ProposalReviewSkeleton() {
	return (
		<LoadingState label={copy.reviewLoading} className={styles.screen}>
			<div className={styles.heading} aria-hidden="true">
				<div className={styles.headerRow}>
					<Skeleton shape="heading" className={styles.titleSkeleton} />
					<div className={styles.headerActions}>
						<Skeleton shape="pill" />
						<Skeleton shape="pill" />
					</div>
				</div>
				<Skeleton />
			</div>
			<div className={styles.panel} aria-hidden="true">
				<Skeleton shape="heading" />
				<ul className={styles.choiceGrid}>
					{[0, 1, 2, 3].map((key) => (
						<li key={key} className={cardStyles.selection}>
							<div className={styles.skeletonBody}>
								<Skeleton shape="box" className={styles.pictureSkeleton} />
								<Skeleton shape="heading" />
								<Skeleton />
							</div>
							<div className={cardStyles.controls}>
								<div className={`${cardStyles.quantity} ${styles.quantitySkeleton}`}>
									<Skeleton />
									<Skeleton shape="pill" />
									<Skeleton shape="pill" />
								</div>
								<Skeleton shape="pill" />
							</div>
						</li>
					))}
				</ul>
			</div>
		</LoadingState>
	);
}
