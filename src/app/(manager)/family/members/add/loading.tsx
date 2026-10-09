import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ProfileFormSkeleton } from "@/features/profiles/components/ProfileForm/ProfileFormSkeleton";
import { profilesCopy } from "@/features/profiles/copy";
import { cx } from "@/lib/class-names";
import styles from "../page.module.css";

// Matches the add page, so the members-list skeleton never stands in for it.
export default function AddMemberLoading() {
	return (
		<div className={cx(styles.page, styles.formPage)}>
			<PageHeader
				title={profilesCopy.addTitle}
				description={profilesCopy.addDescription}
				back={{ href: "/family/members", label: profilesCopy.back }}
			/>
			<ProfileFormSkeleton />
		</div>
	);
}
