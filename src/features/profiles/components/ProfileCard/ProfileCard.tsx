import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ProfileAvatar } from "@/features/profiles/components/ProfileAvatar/ProfileAvatar";
import { profilesCopy } from "@/features/profiles/copy";
import type { ManagedProfileDto } from "@/features/profiles/types";
import { formatDate } from "@/lib/format";
import styles from "./ProfileCard.module.css";

export function ProfileCard({ profile }: { profile: ManagedProfileDto }) {
	return (
		<article className={styles.card} aria-labelledby={`profile-${profile.id}`}>
			<div className={styles.header}>
				<ProfileAvatar avatarKey={profile.avatarKey} />
				<div className={styles.identity}>
					<h3 id={`profile-${profile.id}`} className={styles.name}>{profile.displayName}</h3>
					<p className={styles.kind}>{profilesCopy.kinds[profile.kind]}</p>
				</div>
			</div>
			<p className={styles.description}>{profilesCopy.profileSummaries[profile.kind]}</p>
			<div className={styles.footer}>
				<dl className={styles.added}>
					<dt>{profilesCopy.createdLabel}</dt>
					<dd><time dateTime={profile.createdAt}>{formatDate(profile.createdAt)}</time></dd>
				</dl>
				<ActionLink
					href={`/family/members/${profile.id}`}
					variant="secondary"
					size="sm"
					icon={ArrowRight01Icon}
					className={styles.action}
				>
					{profilesCopy.view}
				</ActionLink>
			</div>
		</article>
	);
}
