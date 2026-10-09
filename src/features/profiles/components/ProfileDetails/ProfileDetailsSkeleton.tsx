import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { profilesCopy } from "@/features/profiles/copy";
import { cx } from "@/lib/class-names";
import styles from "./ProfileDetails.module.css";

// Same card, rows, and fixed labels as ProfileDetails; the person's details are placeholders.
export function ProfileDetailsSkeleton() {
	return (
		<LoadingState label={profilesCopy.loadingProfile} className={styles.detail}>
			<div className={styles.identity}>
				<Skeleton shape="box" className={styles.avatarSkeleton} />
				<div className={styles.identityText}>
					<Skeleton shape="heading" className={cx(styles.name, styles.nameSkeleton)} />
					<Skeleton className={styles.kindSkeleton} />
				</div>
			</div>
			<div className={styles.facts} aria-hidden="true">
				<div>
					<p className={styles.term}>{profilesCopy.familyLabel}</p>
					<Skeleton className={cx(styles.value, styles.valueSkeleton)} />
				</div>
				<div>
					<p className={styles.term}>{profilesCopy.createdLabel}</p>
					<Skeleton className={cx(styles.value, styles.valueSkeleton)} />
				</div>
			</div>
			<div className={styles.notice} aria-hidden="true">
				<p>{profilesCopy.deviceNotice}</p>
				<p>{profilesCopy.deviceUnavailable}</p>
			</div>
			<div className={styles.actions}>
				<Skeleton shape="pill" className={styles.connectSkeleton} />
				<Skeleton shape="pill" className={styles.editSkeleton} />
				<Skeleton shape="pill" className={styles.removeSkeleton} />
			</div>
		</LoadingState>
	);
}
