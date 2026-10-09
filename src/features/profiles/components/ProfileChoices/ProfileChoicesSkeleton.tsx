import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { ProfileAvatar } from "@/features/profiles/components/ProfileAvatar/ProfileAvatar";
import { profilesCopy } from "@/features/profiles/copy";
import { PROFILE_AVATAR_KEYS, PROFILE_KINDS } from "@/features/profiles/presets";
import styles from "./ProfileChoices.module.css";

// The options are fixed presets, so they are shown as they will appear, without inputs and
// with nothing chosen yet. Only the radio circles are placeholders.
export function ProfileChoicesSkeleton({ group }: { group: "kind" | "avatarKey" }) {
	if (group === "kind") {
		return (
			<div className={styles.fieldset} aria-hidden="true">
				<p className={styles.legend}>{profilesCopy.kindLabel}</p>
				<div className={styles.options}>
					{PROFILE_KINDS.map((kind) => (
						<div key={kind} className={styles.option}>
							<Skeleton shape="box" className={styles.radioSkeleton} />
							<span className={styles.text}>
								<span className={styles.label}>{profilesCopy.kinds[kind]}</span>
								<span>{profilesCopy.kindDescriptions[kind]}</span>
							</span>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className={styles.fieldset} aria-hidden="true">
			<p className={styles.legend}>{profilesCopy.avatarLabel}</p>
			<p className={styles.hint}>{profilesCopy.avatarHint}</p>
			<div className={styles.avatars}>
				{PROFILE_AVATAR_KEYS.map((avatarKey) => (
					<div key={avatarKey} className={styles.avatarOption}>
						<ProfileAvatar avatarKey={avatarKey} />
						<span className={styles.avatarName}>{profilesCopy.avatars[avatarKey]}</span>
						<span className={styles.avatarChosen} />
					</div>
				))}
			</div>
		</div>
	);
}
