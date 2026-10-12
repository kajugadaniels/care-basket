import { PencilEdit02Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { DeleteProfileDialog } from "@/features/profiles/components/DeleteProfileDialog/DeleteProfileDialog";
import { ProfileAvatar } from "@/features/profiles/components/ProfileAvatar/ProfileAvatar";
import { profilesCopy } from "@/features/profiles/copy";
import type { ManagedProfileDto } from "@/features/profiles/types";
import { formatDate } from "@/lib/format";
import { isAdultProfile } from "@/lib/audience";
import styles from "./ProfileDetails.module.css";

type ProfileDetailsProps = {
	profile: ManagedProfileDto;
	familyName: string;
};

export function ProfileDetails({ profile, familyName }: ProfileDetailsProps) {
	return (
		<section className={styles.detail} aria-labelledby="profile-name">
			<header className={styles.header}>
				<div className={styles.identity}>
					<ProfileAvatar avatarKey={profile.avatarKey} />
					<div className={styles.identityText}>
						<h2 id="profile-name" className={styles.name}>
							{profile.displayName}
						</h2>
						<p className={styles.kind}>{profilesCopy.kinds[profile.kind]}</p>
					</div>
				</div>
				<ActionLink href={`/family/members/${profile.id}/edit`} variant="secondary" size="sm" icon={PencilEdit02Icon}>
					{profilesCopy.edit}
				</ActionLink>
			</header>
			<div className={styles.content}>
				<dl className={styles.facts}>
					<div className={styles.fact}>
						<dt className={styles.term}>{profilesCopy.familyLabel}</dt>
						<dd className={styles.value}>{familyName}</dd>
					</div>
					<div className={styles.fact}>
						<dt className={styles.term}>{profilesCopy.createdLabel}</dt>
						<dd className={styles.value}>
							<time dateTime={profile.createdAt}>{formatDate(profile.createdAt)}</time>
						</dd>
					</div>
				</dl>
				<section className={styles.device} aria-labelledby="profile-device-title">
					<div className={styles.deviceHeading}>
						<Icon icon={SmartPhone01Icon} size={24} />
						<h3 id="profile-device-title">{profilesCopy.deviceTitle}</h3>
					</div>
					{isAdultProfile(profile.kind) ? <>
						<p>{profilesCopy.deviceNotice}</p>
						<ActionLink href={`/family/devices/connect?profileId=${profile.id}`} size="sm">
							{profilesCopy.connectDevice}
						</ActionLink>
					</> : <p>{profilesCopy.legacyNotice}</p>}
				</section>
			</div>
			<footer className={styles.footer}>
				<DeleteProfileDialog profileId={profile.id} displayName={profile.displayName} />
			</footer>
		</section>
	);
}
