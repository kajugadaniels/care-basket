import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProfileForm } from "@/features/profiles/components/ProfileForm/ProfileForm";
import { profilesCopy } from "@/features/profiles/copy";
import { getManagedProfile } from "@/features/profiles/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import styles from "@/app/(manager)/family/members/page.module.css";

export const metadata: Metadata = { title: profilesCopy.editTitle };

export default async function EditMemberPage({ params }: { params: Promise<{ profileId: string }> }) {
  const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
  const { profileId } = await params;
  const profile = await getManagedProfile(actor, profileId).catch((error: unknown) => {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  });
  return (
    <div className={`${styles.page} ${styles.formPage}`}>
      <Link href="/family/members" className={styles.back}>{profilesCopy.back}</Link>
      <header><h1 className={styles.title}>{profilesCopy.editTitle}</h1><p className={styles.description}>{profilesCopy.editDescription}</p></header>
      <ProfileForm profile={profile} />
    </div>
  );
}
