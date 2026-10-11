import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { requestsCopy } from "../../copy";
import styles from "./RequestUi.module.css";
import basketStyles from "../ManagerBasket/ManagerBasket.module.css";
import detailStyles from "../ManagerRequestDetail/ManagerRequestDetail.module.css";

export function RequestSkeleton({ manager = false }: { manager?: boolean }) {
	if (manager) return (
		<LoadingState label={requestsCopy.loading} className={detailStyles.page}>
			<div aria-hidden="true"><Skeleton shape="heading" /><Skeleton /></div>
			<div className={detailStyles.overview} aria-hidden="true"><Skeleton /><Skeleton /></div>
			<div className={basketStyles.layout} aria-hidden="true">
				<div className={basketStyles.itemsPanel}>
					<div className={basketStyles.itemsHeader}><Skeleton shape="heading" /></div>
					{[0, 1, 2].map((key) => (
						<div key={key} className={basketStyles.skeletonRow}>
							<Skeleton shape="box" className={basketStyles.skeletonPicture} />
							<div className={styles.body}><Skeleton /><Skeleton /><Skeleton /></div>
						</div>
					))}
				</div>
				<div className={basketStyles.summary}><Skeleton shape="heading" /><Skeleton /><Skeleton shape="heading" /><Skeleton shape="pill" /></div>
			</div>
		</LoadingState>
	);

	return <LoadingState label={requestsCopy.loading} className={styles.page}>
		<Skeleton shape="heading" />
		{[0, 1, 2].map((key) => <div key={key} className={`${styles.panel} ${styles.skeleton}`} aria-hidden="true">
			<Skeleton /><Skeleton />
		</div>)}
	</LoadingState>;
}
