import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ProfileFormSkeleton } from "@/features/profiles/components/ProfileForm/ProfileFormSkeleton";
import { profilesCopy } from "@/features/profiles/copy";
import { cx } from "@/lib/class-names";
import styles from "../../page.module.css";

// Matches the edit page, so the profile page's skeleton never stands in for it.
export default function EditMemberLoading() {
	return (
		<div className={cx(styles.page, styles.formPage)}>
			<PageHeader
				title={profilesCopy.editTitle}
				description={profilesCopy.editDescription}
				back={{ href: "/family/members", label: profilesCopy.back }}
			/>
			<ProfileFormSkeleton isEditing />
		</div>
	);
}
