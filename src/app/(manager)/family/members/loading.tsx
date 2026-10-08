import { profilesCopy } from "@/features/profiles/copy";
import styles from "./page.module.css";

// This boundary wraps every nested profile page, including request-time route params.
export default function MembersLoading() {
  return (
    <div className={styles.page} role="status" aria-label={profilesCopy.loading}>
      <h1 className={styles.title}>{profilesCopy.title}</h1>
      <div className={styles.skeleton} aria-hidden="true" />
      <div className={styles.skeleton} aria-hidden="true" />
    </div>
  );
}
