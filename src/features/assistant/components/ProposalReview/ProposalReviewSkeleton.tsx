import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { assistantCopy as copy } from "../../copy";
import styles from "./ProposalReview.module.css";

export function ProposalReviewSkeleton() {
	return (
		<LoadingState label={copy.reviewLoading} className={styles.screen}>
			<div className={styles.heading} aria-hidden="true">
				<Skeleton shape="pill" />
				<Skeleton shape="heading" />
				<Skeleton />
			</div>
			<div className={styles.panel} aria-hidden="true">
				<Skeleton shape="heading" />
				<ul className={styles.choiceGrid}>
					{[0, 1, 2, 3].map((key) => (
						<li key={key} className={styles.choice}>
							<Skeleton shape="box" className={styles.pictureSkeleton} />
							<Skeleton shape="heading" />
							<Skeleton />
							<Skeleton shape="pill" />
						</li>
					))}
				</ul>
			</div>
		</LoadingState>
	);
}
