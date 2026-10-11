import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { requestsCopy } from "../../copy";
import rowStyles from "../RequestUi/RequestList.module.css";
import styles from "./ManagerInbox.module.css";

export function ManagerInboxSkeleton() {
	return (
		<LoadingState label={requestsCopy.loading} className={styles.inbox}>
			<div className={styles.toolbar} aria-hidden="true">
				<div className={styles.field}><Skeleton /><Skeleton shape="pill" /></div>
				<Skeleton shape="pill" />
			</div>
			<div className={styles.resultsHeader} aria-hidden="true"><Skeleton shape="pill" /></div>
			<div className={rowStyles.list} aria-hidden="true">
				{[0, 1, 2].map((key) => (
					<div key={key} className={rowStyles.row}>
						<div className={rowStyles.member}>
							<Skeleton shape="box" className={rowStyles.avatar} />
							<div className={rowStyles.memberDetails}><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
						</div>
						<Skeleton shape="pill" />
						<div className={rowStyles.total}><Skeleton /><Skeleton /></div>
						<Skeleton shape="pill" className={rowStyles.action} />
					</div>
				))}
			</div>
		</LoadingState>
	);
}
