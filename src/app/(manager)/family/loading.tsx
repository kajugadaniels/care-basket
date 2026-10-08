import styles from "./loading.module.css";

// Skeleton with the same layout as the dashboard, so nothing shifts when it loads.
export default function FamilyLoading() {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.visuallyHidden}>Loading your family space…</span>
      <div className={styles.title} aria-hidden="true" />
      <div className={styles.line} aria-hidden="true" />
      <div className={styles.block} aria-hidden="true" />
      <div className={styles.block} aria-hidden="true" />
      <div className={styles.block} aria-hidden="true" />
    </div>
  );
}
