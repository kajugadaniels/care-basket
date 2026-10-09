import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { getFamilyOverview } from "@/features/family/server/service";
import { ProfileDetails } from "@/features/profiles/components/ProfileDetails/ProfileDetails";
import { ProfileDetailsSkeleton } from "@/features/profiles/components/ProfileDetails/ProfileDetailsSkeleton";
import { profilesCopy } from "@/features/profiles/copy";
import { getManagedProfile } from "@/features/profiles/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import { getAiPreference } from "@/features/assistant/server/service";
import { AiPreference } from "@/features/assistant/components/AiPreference/AiPreference";
import styles from "../page.module.css";

export const metadata: Metadata = { title: profilesCopy.detailTitle };

type MemberPageProps = {
	params: Promise<{ profileId: string }>;
};

export default function MemberPage({ params }: MemberPageProps) {
	return (
		<div className={styles.page}>
			<PageHeader title={profilesCopy.detailTitle} back={{ href: "/family/members", label: profilesCopy.back }} />
			<Suspense fallback={<ProfileDetailsSkeleton />}>
				<MemberDetails params={params} />
			</Suspense>
		</div>
	);
}

// Profiles outside the adult's family resolve to the same not-found page as missing ones.
async function MemberDetails({ params }: MemberPageProps) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const { profileId } = await params;
	const [profile, family] = await Promise.all([
		getManagedProfile(actor, profileId).catch((error: unknown) => {
			if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
			throw error;
		}),
		getFamilyOverview(actor),
	]);

	const preference = await getAiPreference(actor, profileId);
	return <>
		<ProfileDetails profile={profile} familyName={family.familyName} />
		{profile.kind === "ASSISTED_ADULT" ? <AiPreference profileId={profile.id} {...preference} /> : null}
	</>;
}
