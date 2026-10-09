import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { requestsCopy } from "../../copy";
import styles from "./RequestUi.module.css";

export function RequestSkeleton() {
	return <LoadingState label={requestsCopy.loading} className={styles.page}>
		<Skeleton shape="heading" />
		{[0, 1, 2].map((key) => <div key={key} className={`${styles.panel} ${styles.skeleton}`} aria-hidden="true">
			<Skeleton /><Skeleton />
		</div>)}
	</LoadingState>;
}
