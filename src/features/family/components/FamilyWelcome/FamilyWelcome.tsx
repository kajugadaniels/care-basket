import { CheckmarkCircle02Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { familyDashboardCopy } from "@/features/family/copy";
import type { FamilyOverview } from "@/features/family/types";
import styles from "./FamilyWelcome.module.css";

type FamilyWelcomeProps = {
	family: FamilyOverview;
	profileCount: number;
};

// The personal part of the family overview. FamilyWelcomeSkeleton mirrors this layout.
export function FamilyWelcome({ family, profileCount }: FamilyWelcomeProps) {
	const hasMembers = profileCount > 0;

	return (
		<div className={styles.welcome}>
			<h1 className={styles.title}>{familyDashboardCopy.greeting(family.displayName)}</h1>

			<section aria-labelledby="family-summary-title" className={styles.summary}>
				<span className={styles.summaryIcon}>
					<Icon icon={UserGroupIcon} size={24} />
				</span>
				<div className={styles.summaryText}>
					<p className={styles.summaryLabel}>{familyDashboardCopy.familyLabel}</p>
					<h2 id="family-summary-title" className={styles.familyName}>
						{family.familyName}
					</h2>
				</div>
				<span className={styles.role}>{familyDashboardCopy.roles[family.role]}</span>
			</section>

			<div className={styles.ready}>
				<Icon icon={CheckmarkCircle02Icon} size={24} className={styles.readyIcon} />
				<div>
					<p className={styles.readyTitle}>{familyDashboardCopy.memberCount({ count: profileCount })}</p>
					{hasMembers ? null : <p className={styles.readyText}>{familyDashboardCopy.readyText}</p>}
				</div>
			</div>

			<ActionLink href={hasMembers ? "/family/members" : "/family/members/add"} className={styles.memberAction}>
				{hasMembers ? familyDashboardCopy.viewMembers : familyDashboardCopy.addMember}
			</ActionLink>
		</div>
	);
}
