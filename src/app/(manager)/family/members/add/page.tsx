import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ProfileForm } from "@/features/profiles/components/ProfileForm/ProfileForm";
import { profilesCopy } from "@/features/profiles/copy";
import { cx } from "@/lib/class-names";
import { requireAdult } from "@/server/auth/require-adult";
import styles from "../page.module.css";

export const metadata: Metadata = { title: profilesCopy.addTitle };

// The empty form holds no family data, so it renders at once. The session check streams
// beside it, and the create action authorizes again on submit.
export default function AddMemberPage() {
	return (
		<div className={cx(styles.page, styles.formPage)}>
			<PageHeader
				title={profilesCopy.addTitle}
				description={profilesCopy.addDescription}
				back={{ href: "/family/members", label: profilesCopy.back }}
			/>
			<ProfileForm />
			<Suspense fallback={null}>
				<ManagerAccessCheck />
			</Suspense>
		</div>
	);
}

// Sends signed-out visitors to sign-in and adults without a family to setup.
async function ManagerAccessCheck() {
	await requireAdult({ roles: ["OWNER", "MANAGER"] });
	return null;
}
