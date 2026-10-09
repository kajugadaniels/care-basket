import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cx } from "@/lib/class-names";
import styles from "./ProfileCard.module.css";

// Same card box and spacing as ProfileCard, with placeholders for the avatar, name, type, and link.
export function ProfileCardSkeleton() {
	return (
		<div className={styles.card}>
			<Skeleton shape="box" className={styles.avatarSkeleton} />
			<div className={styles.identity}>
				<Skeleton shape="heading" className={cx(styles.name, styles.nameSkeleton)} />
				<Skeleton className={cx(styles.kind, styles.kindSkeleton)} />
			</div>
			<Skeleton shape="pill" className={styles.actionSkeleton} />
		</div>
	);
}
