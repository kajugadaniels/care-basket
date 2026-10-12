import { UserGroupIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { ProfileCard } from "@/features/profiles/components/ProfileCard/ProfileCard";
import { profilesCopy } from "@/features/profiles/copy";
import type { ManagedProfileDto } from "@/features/profiles/types";
import styles from "./ProfileList.module.css";

// The empty state has no button of its own: the page header's always-visible
// "Add Family Member" action sits directly above it.
export function ProfileList({ profiles }: { profiles: ManagedProfileDto[] }) {
	if (!profiles.length) {
		return (
			<section className={styles.empty} aria-labelledby="profiles-empty-title">
				<span className={styles.emptyIcon}><Icon icon={UserGroupIcon} size={48} /></span>
				<div className={styles.emptyText}>
					<h2 id="profiles-empty-title">{profilesCopy.emptyTitle}</h2>
					<p>{profilesCopy.emptyText}</p>
				</div>
			</section>
		);
	}

	return (
		<section className={styles.directory} aria-labelledby="profiles-directory-title">
			<div className={styles.heading}>
				<h2 id="profiles-directory-title">{profilesCopy.directoryTitle}</h2>
				<p>{profilesCopy.directoryHelp}</p>
			</div>
			<ul className={styles.grid} role="list" aria-labelledby="profiles-directory-title">
				{profiles.map((profile) => <li key={profile.id}><ProfileCard profile={profile} /></li>)}
			</ul>
		</section>
	);
}
