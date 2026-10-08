import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
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
  const isKind = group === "kind";
  const options = isKind ? PROFILE_KINDS : PROFILE_AVATAR_KEYS;
  const errorId = `${group}-error`;
  return (
    <fieldset className={styles.fieldset} aria-describedby={error ? errorId : undefined}>
      <legend className={styles.legend}>{isKind ? profilesCopy.kindLabel : profilesCopy.avatarLabel}</legend>
      <div className={cx(styles.options, !isKind && styles.avatars)}>
        {options.map((option) => {
          const checked = value === option;
          const label = isKind ? profilesCopy.kinds[option as ProfileKind]
            : profilesCopy.avatars[option as ProfileAvatarKey];
          return (
            <label key={option} className={cx(styles.option, checked && styles.selected)}>
              <input type="radio" name={group} value={option} checked={checked} required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                onChange={() => onChange(option)} />
              {!isKind ? <ProfileAvatar avatarKey={option as ProfileAvatarKey} /> : null}
              <span className={styles.text}>
                <span className={styles.label}>{label}</span>
                {isKind ? <span>{profilesCopy.kindDescriptions[option as ProfileKind]}</span> : null}
                {checked ? <span className={styles.chosen}><Icon icon={CheckmarkCircle02Icon} size={20} />{profilesCopy.chosen}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? <p id={errorId} className={styles.error}>{error}</p> : null}
    </fieldset>
  );
}
