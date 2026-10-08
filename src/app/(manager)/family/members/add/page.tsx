import type { Metadata } from "next";
import Link from "next/link";
import { ProfileForm } from "@/features/profiles/components/ProfileForm/ProfileForm";
import { profilesCopy } from "@/features/profiles/copy";
import { requireAdult } from "@/server/auth/require-adult";
import styles from "../page.module.css";

export const metadata: Metadata = { title: profilesCopy.addTitle };

export default async function AddMemberPage() {
  await requireAdult({ roles: ["OWNER", "MANAGER"] });
  return (
    <div className={`${styles.page} ${styles.formPage}`}>
      <Link href="/family/members" className={styles.back}>{profilesCopy.back}</Link>
      <header><h1 className={styles.title}>{profilesCopy.addTitle}</h1><p className={styles.description}>{profilesCopy.addDescription}</p></header>
      <ProfileForm />
    </div>
  );
}
