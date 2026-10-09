import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ProfileList } from "@/features/profiles/components/ProfileList/ProfileList";
import { ProfileListSkeleton } from "@/features/profiles/components/ProfileList/ProfileListSkeleton";
import { profilesCopy } from "@/features/profiles/copy";
import { listManagedProfilesSchema } from "@/features/profiles/schemas";
import { listManagedProfiles } from "@/features/profiles/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import styles from "./page.module.css";

export const metadata: Metadata = { title: profilesCopy.title };

type MembersPageProps = {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

// The header and its add action are static and render at once; the family's profiles stream in.
export default function MembersPage({ searchParams }: MembersPageProps) {
	return (
		<div className={styles.page}>
			<PageHeader
				title={profilesCopy.title}
				description={profilesCopy.description}
				actions={<ActionLink href="/family/members/add">{profilesCopy.add}</ActionLink>}
			/>
			<Suspense fallback={<ProfileListSkeleton />}>
				<MemberDirectory searchParams={searchParams} />
			</Suspense>
		</div>
	);
}

async function MemberDirectory({ searchParams }: MembersPageProps) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const parsed = listManagedProfilesSchema.safeParse(await searchParams);
	if (!parsed.success) notFound();

	const { profiles, nextCursor } = await listManagedProfiles(actor, parsed.data);
	const hasPagination = Boolean(parsed.data.after || nextCursor);

	return (
		<>
			<ProfileList profiles={profiles} />
			{hasPagination ? (
				<div className={styles.actions}>
					{parsed.data.after ? (
						<ActionLink href="/family/members" variant="secondary">
							{profilesCopy.first}
						</ActionLink>
					) : null}
					{nextCursor ? (
						<ActionLink href={`/family/members?after=${nextCursor}`} variant="secondary">
							{profilesCopy.next}
						</ActionLink>
					) : null}
				</div>
			) : null}
		</>
	);
}
