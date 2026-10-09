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
        <Icon icon={UserGroupIcon} size={48} />
        <h2 id="profiles-empty-title">{profilesCopy.emptyTitle}</h2>
        <p>{profilesCopy.emptyText}</p>
      </section>
    );
  }
  return (
    <ul className={styles.grid} role="list">
      {profiles.map((profile) => <li key={profile.id}><ProfileCard profile={profile} /></li>)}
    </ul>
  );
}
