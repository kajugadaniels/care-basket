import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateFamilyForm } from "@/features/family/components/CreateFamilyForm/CreateFamilyForm";
import { familySetupCopy } from "@/features/family/copy";
import { ensureUser } from "@/server/auth/ensure-user";
import { findFamilyMembership } from "@/server/auth/family-membership";
import { requireAuthenticatedUser } from "@/server/auth/require-authenticated-user";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: familySetupCopy.metaTitle,
};

// For signed-in adults without a family. Reads the session at request time; the setup
// loading.tsx provides the Suspense boundary.
export default async function FamilySetupPage() {
  const user = await ensureUser();
  if (await findFamilyMembership(user.id)) {
    redirect("/family");
  }

  const { firstName } = await requireAuthenticatedUser();

  return (
    <div className={styles.page}>
      <hgroup>
        <h1 className={styles.title}>{familySetupCopy.title}</h1>
        <p className={styles.description}>{familySetupCopy.description}</p>
      </hgroup>

      <div className={styles.card}>
        <CreateFamilyForm defaultDisplayName={firstName ?? ""} />
      </div>

      <p className={styles.reassurance}>{familySetupCopy.reassurance}</p>
    </div>
  );
}
