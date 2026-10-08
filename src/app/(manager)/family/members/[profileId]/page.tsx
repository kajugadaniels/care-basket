import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { getFamilyOverview } from "@/features/family/server/service";
import { DeleteProfileDialog } from "@/features/profiles/components/DeleteProfileDialog/DeleteProfileDialog";
import { ProfileAvatar } from "@/features/profiles/components/ProfileAvatar/ProfileAvatar";
import { profilesCopy } from "@/features/profiles/copy";
import { getManagedProfile } from "@/features/profiles/server/service";
import { formatDate } from "@/lib/format";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import styles from "../page.module.css";

export const metadata: Metadata = { title: profilesCopy.detailTitle };

export default async function MemberPage({ params }: { params: Promise<{ profileId: string }> }) {
  const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
  const { profileId } = await params;
  const [profile, family] = await Promise.all([
    getManagedProfile(actor, profileId).catch((error: unknown) => {
      if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
      throw error;
    }),
    getFamilyOverview(actor),
  ]);
  return (
    <div className={styles.page}>
      <Link href="/family/members" className={styles.back}>{profilesCopy.back}</Link>
      <h1 className={styles.title}>{profilesCopy.detailTitle}</h1>
      <section className={styles.detail} aria-labelledby="profile-name">
        <div className={styles.identity}>
          <ProfileAvatar avatarKey={profile.avatarKey} />
          <div><h2 id="profile-name">{profile.displayName}</h2><p>{profilesCopy.kinds[profile.kind]}</p></div>
        </div>
        <dl className={styles.facts}>
          <div><dt>{profilesCopy.familyLabel}</dt><dd>{family.familyName}</dd></div>
          <div><dt>{profilesCopy.createdLabel}</dt><dd><time dateTime={profile.createdAt}>{formatDate(profile.createdAt)}</time></dd></div>
        </dl>
        <div className={styles.notice}><p>{profilesCopy.deviceNotice}</p><p>{profilesCopy.deviceUnavailable}</p></div>
        <div className={styles.actions}>
          <ActionLink href={`/family/members/${profile.id}/edit`}>{profilesCopy.edit}</ActionLink>
          <DeleteProfileDialog profileId={profile.id} displayName={profile.displayName} />
        </div>
      </section>
    </div>
  );
}
