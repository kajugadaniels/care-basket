import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ProfileList } from "@/features/profiles/components/ProfileList/ProfileList";
import { profilesCopy } from "@/features/profiles/copy";
import { listManagedProfilesSchema } from "@/features/profiles/schemas";
import { listManagedProfiles } from "@/features/profiles/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import styles from "./page.module.css";

export const metadata: Metadata = { title: profilesCopy.title };

export default async function MembersPage({ searchParams }: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
  const parsed = listManagedProfilesSchema.safeParse(await searchParams);
  if (!parsed.success) notFound();
  const { profiles, nextCursor } = await listManagedProfiles(actor, parsed.data);
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><h1 className={styles.title}>{profilesCopy.title}</h1><p className={styles.description}>{profilesCopy.description}</p></div>
        {profiles.length ? <ActionLink href="/family/members/add">{profilesCopy.add}</ActionLink> : null}
      </header>
      <ProfileList profiles={profiles} />
      <div className={styles.actions}>
        {parsed.data.after ? <ActionLink href="/family/members" variant="secondary">{profilesCopy.first}</ActionLink> : null}
        {nextCursor ? <ActionLink href={`/family/members?after=${nextCursor}`} variant="secondary">{profilesCopy.next}</ActionLink> : null}
      </div>
    </div>
  );
}
