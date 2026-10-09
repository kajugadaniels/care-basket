import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ProfileForm } from "@/features/profiles/components/ProfileForm/ProfileForm";
import { ProfileFormSkeleton } from "@/features/profiles/components/ProfileForm/ProfileFormSkeleton";
import { profilesCopy } from "@/features/profiles/copy";
import { getManagedProfile } from "@/features/profiles/server/service";
import { cx } from "@/lib/class-names";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import styles from "../../page.module.css";

export const metadata: Metadata = { title: profilesCopy.editTitle };

type EditMemberPageProps = {
	params: Promise<{ profileId: string }>;
};

export default function EditMemberPage({ params }: EditMemberPageProps) {
	return (
		<div className={cx(styles.page, styles.formPage)}>
			<PageHeader
				title={profilesCopy.editTitle}
				description={profilesCopy.editDescription}
				back={{ href: "/family/members", label: profilesCopy.back }}
			/>
			<Suspense fallback={<ProfileFormSkeleton isEditing />}>
				<EditMemberForm params={params} />
			</Suspense>
		</div>
	);
}

async function EditMemberForm({ params }: EditMemberPageProps) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const { profileId } = await params;
	const profile = await getManagedProfile(actor, profileId).catch((error: unknown) => {
		if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
		throw error;
	});

	return <ProfileForm profile={profile} />;
}
