import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ProfileAvatar } from "@/features/profiles/components/ProfileAvatar/ProfileAvatar";
import { profilesCopy } from "@/features/profiles/copy";
import type { ManagedProfileDto } from "@/features/profiles/types";
import styles from "./ProfileCard.module.css";

export function ProfileCard({ profile }: { profile: ManagedProfileDto }) {
	return (
		<article className={styles.card} aria-labelledby={`profile-${profile.id}`}>
			<div className={styles.header}>
				<ProfileAvatar avatarKey={profile.avatarKey} />
				<div className={styles.identity}>
					<h2 id={`profile-${profile.id}`} className={styles.name}>{profile.displayName}</h2>
					<p className={styles.kind}>{profilesCopy.kinds[profile.kind]}</p>
				</div>
			</div>
			<ActionLink
				href={`/family/members/${profile.id}`}
				variant="secondary"
				size="sm"
				icon={ArrowRight01Icon}
				className={styles.action}
			>
				{profilesCopy.view}
			</ActionLink>
		</article>
	);
}
