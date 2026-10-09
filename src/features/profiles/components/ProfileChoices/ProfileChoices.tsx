import { CheckmarkCircle02Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { ProfileAvatar } from "@/features/profiles/components/ProfileAvatar/ProfileAvatar";
import { profilesCopy } from "@/features/profiles/copy";
import { PROFILE_AVATAR_KEYS, PROFILE_KINDS } from "@/features/profiles/presets";
import type { ProfileAvatarKey, ProfileKind } from "@/features/profiles/types";
import { cx } from "@/lib/class-names";
import styles from "./ProfileChoices.module.css";

type ProfileChoicesProps = {
	group: "kind" | "avatarKey";
	value: string;
	onChange: (value: ProfileKind | ProfileAvatarKey) => void;
	error?: string;
};

// Native radio groups supply arrow-key selection, tab navigation, and checked announcements.
export function ProfileChoices({ group, value, onChange, error }: ProfileChoicesProps) {
	const errorId = `${group}-error`;
	const hintId = `${group}-hint`;
	const isKind = group === "kind";
	const describedBy = [isKind ? null : hintId, error ? errorId : null].filter(Boolean).join(" ") || undefined;

	return (
		<fieldset className={styles.fieldset} aria-describedby={describedBy}>
			<legend className={styles.legend}>{isKind ? profilesCopy.kindLabel : profilesCopy.avatarLabel}</legend>
			{isKind ? (
				<div className={styles.options}>
					{PROFILE_KINDS.map((kind) => (
						<KindOption key={kind} kind={kind} checked={value === kind} onChange={onChange} />
					))}
				</div>
			) : (
				<>
					<p id={hintId} className={styles.hint}>
						{profilesCopy.avatarHint}
					</p>
					<div className={styles.avatars}>
						{PROFILE_AVATAR_KEYS.map((avatarKey) => (
							<AvatarOption key={avatarKey} avatarKey={avatarKey} checked={value === avatarKey} onChange={onChange} />
						))}
					</div>
				</>
			)}
			{error ? (
				<p id={errorId} className={styles.error}>
					{error}
				</p>
			) : null}
		</fieldset>
	);
}

type OptionProps<T> = {
	checked: boolean;
	onChange: (value: T) => void;
};

function KindOption({ kind, checked, onChange }: OptionProps<ProfileKind> & { kind: ProfileKind }) {
	return (
		<label className={cx(styles.option, checked && styles.selected)}>
			<input type="radio" name="kind" value={kind} checked={checked} required onChange={() => onChange(kind)} />
			<span className={styles.text}>
				<span className={styles.label}>{profilesCopy.kinds[kind]}</span>
				<span>{profilesCopy.kindDescriptions[kind]}</span>
				{checked ? (
					<span className={styles.chosen}>
						<Icon icon={CheckmarkCircle02Icon} size={20} />
						{profilesCopy.chosen}
					</span>
				) : null}
			</span>
		</label>
	);
}

// The radio is visually hidden but still focused and announced; the whole tile is its label.
// "Chosen" keeps a reserved line, so selecting a tile never changes the grid's height.
function AvatarOption({ avatarKey, checked, onChange }: OptionProps<ProfileAvatarKey> & { avatarKey: ProfileAvatarKey }) {
	return (
		<label className={cx(styles.avatarOption, checked && styles.avatarSelected)}>
			<input
				type="radio"
				name="avatarKey"
				value={avatarKey}
				checked={checked}
				required
				className={styles.hiddenRadio}
				onChange={() => onChange(avatarKey)}
			/>
			<span className={styles.checkBadge}>
				<Icon icon={Tick02Icon} size={20} />
			</span>
			<ProfileAvatar avatarKey={avatarKey} />
			<span className={styles.avatarName}>{profilesCopy.avatars[avatarKey]}</span>
			<span className={styles.avatarChosen}>{checked ? profilesCopy.chosen : null}</span>
		</label>
	);
}
