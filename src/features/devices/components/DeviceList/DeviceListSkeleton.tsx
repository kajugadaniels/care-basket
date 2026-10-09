import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cx } from "@/lib/class-names";
import { devicesCopy } from "../../copy";
import styles from "./DeviceList.module.css";

// Enough cards to fill the first row at every breakpoint of the real grid.
const PLACEHOLDER_CARDS = ["first", "second", "third"];

export function DeviceListSkeleton() {
	return (
		<LoadingState label={devicesCopy.loading}>
			<ul className={styles.list} aria-hidden="true">
				{PLACEHOLDER_CARDS.map((key) => (
					<li key={key} className={styles.card}>
						<Skeleton shape="heading" className={cx(styles.title, styles.titleSkeleton)} />
						<Skeleton className={styles.nameSkeleton} />
						<Skeleton className={styles.summarySkeleton} />
						<div className={styles.status}>
							<Skeleton shape="box" className={styles.statusIconSkeleton} />
							<Skeleton className={styles.statusTextSkeleton} />
						</div>
						<div className={styles.facts}>
							<div>
								<p className={styles.term}>{devicesCopy.connected}</p>
								<Skeleton className={styles.dateSkeleton} />
							</div>
							<div>
								<p className={styles.term}>{devicesCopy.lastActivity}</p>
								<Skeleton className={styles.dateSkeleton} />
							</div>
						</div>
						<Skeleton shape="pill" className={styles.actionSkeleton} />
					</li>
				))}
			</ul>
		</LoadingState>
	);
}
