import { CheckmarkCircle02Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { familyDashboardCopy } from "@/features/family/copy";
import { cx } from "@/lib/class-names";
import styles from "./FamilyWelcome.module.css";

// Same containers and classes as FamilyWelcome; only the personal values are placeholders.
// Fixed labels are real but hidden from screen readers, which hear the loading label instead.
export function FamilyWelcomeSkeleton() {
	return (
		<LoadingState label={familyDashboardCopy.loading} className={styles.welcome}>
			<Skeleton shape="heading" className={cx(styles.title, styles.titleSkeleton)} />

			<div className={styles.summary} aria-hidden="true">
				<span className={styles.summaryIcon}>
					<Icon icon={UserGroupIcon} size={24} />
				</span>
				<div className={styles.summaryText}>
					<p className={styles.summaryLabel}>{familyDashboardCopy.familyLabel}</p>
					<Skeleton shape="heading" className={cx(styles.familyName, styles.familyNameSkeleton)} />
				</div>
				<span className={cx(styles.role, styles.roleSkeleton)}>
					<Skeleton />
				</span>
			</div>

			<div className={styles.ready} aria-hidden="true">
				<Icon icon={CheckmarkCircle02Icon} size={24} className={styles.readyIcon} />
				<Skeleton className={styles.readySkeleton} />
			</div>

			<Skeleton shape="pill" className={styles.actionSkeleton} />
			<div className={styles.ready} aria-hidden="true">
				<Skeleton shape="heading" className={styles.readySkeleton} />
				<Skeleton shape="pill" className={styles.actionSkeleton} />
			</div>
		</LoadingState>
	);
}
