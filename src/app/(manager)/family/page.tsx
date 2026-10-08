import type { Metadata } from "next";
import { CheckmarkCircle02Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { SetupPreview } from "@/features/family/components/SetupPreview/SetupPreview";
import { familyDashboardCopy } from "@/features/family/copy";
import { getFamilyOverview } from "@/features/family/server/service";
import { countManagedProfiles } from "@/features/profiles/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: familyDashboardCopy.metaTitle,
};

// Reads the session at request time; loading.tsx provides the Suspense boundary.
// requireAdult() sends signed-out visitors to sign-in and adults without a family to setup.
export default async function FamilyPage() {
  const actor = await requireAdult();
  const [family, profileCount] = await Promise.all([
    getFamilyOverview(actor), countManagedProfiles(actor),
  ]);

  return (
    <div className={styles.page}>
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
          {profileCount === 0 ? <p className={styles.readyText}>{familyDashboardCopy.readyText}</p> : null}
        </div>
      </div>

      <ActionLink href={profileCount === 0 ? "/family/members/add" : "/family/members"} className={styles.memberAction}>
        {profileCount === 0 ? familyDashboardCopy.addMember : familyDashboardCopy.viewMembers}
      </ActionLink>

      <SetupPreview />
    </div>
  );
}
