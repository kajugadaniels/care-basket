import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ProfileListSkeleton } from "@/features/profiles/components/ProfileList/ProfileListSkeleton";
import { profilesCopy } from "@/features/profiles/copy";
import styles from "./page.module.css";

// Matches the members page: the static header is real, only the profile cards are placeholders.
// Nested profile routes have their own loading files, so their skeletons match their pages.
export default function MembersLoading() {
	return (
		<div className={styles.page}>
			<PageHeader
				title={profilesCopy.title}
				description={profilesCopy.description}
				actions={<ActionLink href="/family/members/add">{profilesCopy.add}</ActionLink>}
			/>
			<ProfileListSkeleton />
		</div>
	);
}
