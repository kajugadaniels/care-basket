import type { Metadata } from "next";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { SetupPreview } from "@/features/family/components/SetupPreview/SetupPreview";
import { familyDashboardCopy } from "@/features/family/copy";
import { requireAuthenticatedUser } from "@/server/auth/require-authenticated-user";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: familyDashboardCopy.metaTitle,
};

// Reads the session at request time; loading.tsx provides the Suspense boundary.
export default async function FamilyPage() {
  const user = await requireAuthenticatedUser();
  const greeting = user.firstName
    ? familyDashboardCopy.greeting(user.firstName)
    : familyDashboardCopy.greetingFallback;

  return (
    <div className={styles.page}>
      <hgroup>
        <h1 className={styles.title}>{greeting}</h1>
        <p className={styles.lead}>{familyDashboardCopy.lead}</p>
      </hgroup>

      <div className={styles.notice} role="note">
        <Icon icon={InformationCircleIcon} size={24} className={styles.noticeIcon} />
        <div>
          <p className={styles.noticeTitle}>{familyDashboardCopy.noticeTitle}</p>
          <p className={styles.noticeText}>{familyDashboardCopy.noticeText}</p>
        </div>
      </div>

      <SetupPreview />
    </div>
  );
}
