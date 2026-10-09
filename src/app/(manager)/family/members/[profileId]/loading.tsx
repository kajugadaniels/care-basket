import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ProfileDetailsSkeleton } from "@/features/profiles/components/ProfileDetails/ProfileDetailsSkeleton";
import { profilesCopy } from "@/features/profiles/copy";
import styles from "../page.module.css";

// Matches the profile page, so the members-list skeleton never stands in for it.
export default function MemberLoading() {
	return (
		<div className={styles.page}>
			<PageHeader title={profilesCopy.detailTitle} back={{ href: "/family/members", label: profilesCopy.back }} />
			<ProfileDetailsSkeleton />
		</div>
	);
}
