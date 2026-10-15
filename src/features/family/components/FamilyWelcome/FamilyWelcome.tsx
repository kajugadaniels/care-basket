import { ArrowRight01Icon, ShoppingBasket01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { familyDashboardCopy } from "@/features/family/copy";
import type { FamilyOverview } from "@/features/family/types";
import { requestsCopy } from "@/features/requests/copy";
import styles from "./FamilyWelcome.module.css";

type FamilyWelcomeProps = {
	family: FamilyOverview;
	profileCount: number;
	pendingRequestCount?: number;
};

// The personal overview for the authenticated manager's family.
export function FamilyWelcome({ family, profileCount, pendingRequestCount = 0 }: FamilyWelcomeProps) {
	const hasMembers = profileCount > 0;
	const hasPendingRequests = pendingRequestCount > 0;

	return (
		<div className={styles.welcome}>
			<section aria-label={family.familyName} className={styles.hero}>
				<div className={styles.heroText}>
					<h1 className={styles.title}>{familyDashboardCopy.greeting(family.displayName)}</h1>
					<p className={styles.intro}>{familyDashboardCopy.intro}</p>
				</div>

				<div className={styles.identity}>
					<span className={styles.identityIcon}>
						<Icon icon={UserGroupIcon} size={24} />
					</span>
					<div className={styles.identityText}>
						<p className={styles.familyName}>{family.familyName}</p>
						<p className={styles.role}>{familyDashboardCopy.roles[family.role]}</p>
					</div>
				</div>
			</section>

			<section aria-labelledby="family-overview-title" className={styles.overview}>
				<div className={styles.overviewHeading}>
					<h2 id="family-overview-title">{familyDashboardCopy.atAGlance}</h2>
				</div>

				<div className={styles.rows}>
					<article className={styles.row}>
						<span className={styles.rowIcon}>
							<Icon icon={UserGroupIcon} size={24} />
						</span>
						<div className={styles.rowText}>
							<h3>{familyDashboardCopy.memberCount({ count: profileCount })}</h3>
							<p>{hasMembers ? familyDashboardCopy.membersHelp : familyDashboardCopy.readyText}</p>
						</div>
						<ActionLink
							href={hasMembers ? "/family/members" : "/family/members/add"}
							variant={hasMembers ? "secondary" : "primary"}
							size="sm"
							icon={ArrowRight01Icon}
							className={styles.rowAction}
						>
							{hasMembers ? familyDashboardCopy.viewMembers : familyDashboardCopy.addMember}
						</ActionLink>
					</article>

					<article className={hasPendingRequests ? styles.attentionRow : styles.row}>
						<span className={hasPendingRequests ? styles.attentionIcon : styles.rowIcon}>
							<Icon icon={ShoppingBasket01Icon} size={24} />
						</span>
						<div className={styles.rowText}>
							<h3>{requestsCopy.pendingCount(pendingRequestCount)}</h3>
							<p>{hasPendingRequests ? familyDashboardCopy.requestsHelp(pendingRequestCount) : requestsCopy.emptyHelp}</p>
						</div>
						<ActionLink
							href="/family/requests"
							variant={hasPendingRequests ? "primary" : "secondary"}
							size="sm"
							icon={ArrowRight01Icon}
							className={styles.rowAction}
						>
							{requestsCopy.inbox}
						</ActionLink>
					</article>
				</div>
			</section>
		</div>
	);
}
