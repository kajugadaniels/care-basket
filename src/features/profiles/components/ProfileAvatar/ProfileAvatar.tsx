import { FlowerIcon, Leaf01Icon, SmileIcon, Sun03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import type { ProfileAvatarKey } from "@/features/profiles/types";
import styles from "./ProfileAvatar.module.css";

const AVATAR_ICONS = { smile: SmileIcon, sun: Sun03Icon, flower: FlowerIcon, leaf: Leaf01Icon };

// Decorative next to the person's name, or a visible preset label in the avatar picker.
export function ProfileAvatar({ avatarKey }: { avatarKey: ProfileAvatarKey }) {
  return <span className={styles.avatar}><Icon icon={AVATAR_ICONS[avatarKey]} size={32} /></span>;
}
