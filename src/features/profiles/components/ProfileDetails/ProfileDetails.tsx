import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { DeleteProfileDialog } from "@/features/profiles/components/DeleteProfileDialog/DeleteProfileDialog";
import { ProfileAvatar } from "@/features/profiles/components/ProfileAvatar/ProfileAvatar";
import { profilesCopy } from "@/features/profiles/copy";
import type { ManagedProfileDto } from "@/features/profiles/types";
import { formatDate } from "@/lib/format";
import styles from "./ProfileDetails.module.css";

type ProfileDetailsProps = {
	profile: ManagedProfileDto;
	familyName: string;
};

// One family member's profile and its actions. ProfileDetailsSkeleton mirrors this layout.
export function ProfileDetails({ profile, familyName }: ProfileDetailsProps) {
	return (
		<section className={styles.detail} aria-labelledby="profile-name">
			<div className={styles.identity}>
				<ProfileAvatar avatarKey={profile.avatarKey} />
				<div className={styles.identityText}>
					<h2 id="profile-name" className={styles.name}>
						{profile.displayName}
					</h2>
					<p>{profilesCopy.kinds[profile.kind]}</p>
				</div>
			</div>
			<dl className={styles.facts}>
				<div>
					<dt className={styles.term}>{profilesCopy.familyLabel}</dt>
					<dd className={styles.value}>{familyName}</dd>
				</div>
				<div>
					<dt className={styles.term}>{profilesCopy.createdLabel}</dt>
					<dd className={styles.value}>
						<time dateTime={profile.createdAt}>{formatDate(profile.createdAt)}</time>
					</dd>
				</div>
			</dl>
			<div className={styles.notice}>
				<p>{profilesCopy.deviceNotice}</p>
				<p>{profilesCopy.deviceUnavailable}</p>
			</div>
			<div className={styles.actions}>
				<ActionLink href={`/family/devices/connect?profileId=${profile.id}`}>{profilesCopy.connectDevice}</ActionLink>
				<ActionLink href={`/family/members/${profile.id}/edit`} variant="secondary">
					{profilesCopy.edit}
				</ActionLink>
				<DeleteProfileDialog profileId={profile.id} displayName={profile.displayName} />
			</div>
		</section>
	);
}
