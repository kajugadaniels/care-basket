import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProfileForm } from "@/features/profiles/components/ProfileForm/ProfileForm";
import { profilesCopy } from "@/features/profiles/copy";
import { requireAdult } from "@/server/auth/require-adult";
import styles from "../page.module.css";

export const metadata: Metadata = { title: profilesCopy.addTitle };

export default function AddMemberPage() {
  return (
    <Suspense fallback={<AddMemberLoading />}>
      <AddMemberContent />
    </Suspense>
  );
}

export async function AddMemberContent() {
  await requireAdult({ roles: ["OWNER", "MANAGER"] });
  return (
    <div className={`${styles.page} ${styles.formPage}`}>
      <Link href="/family/members" className={styles.back}>{profilesCopy.back}</Link>
      <header><h1 className={styles.title}>{profilesCopy.addTitle}</h1><p className={styles.description}>{profilesCopy.addDescription}</p></header>
      <ProfileForm />
    </div>
  );
}

function AddMemberLoading() {
  return (
    <div
      className={`${styles.page} ${styles.formPage}`}
      role="status"
      aria-label={profilesCopy.loading}
    >
      <header>
        <h1 className={styles.title}>{profilesCopy.addTitle}</h1>
        <p className={styles.description}>{profilesCopy.addDescription}</p>
      </header>
      <div className={styles.skeleton} aria-hidden="true" />
    </div>
  );
}
