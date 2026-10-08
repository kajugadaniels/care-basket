import styles from "./SkipLink.module.css";

type SkipLinkProps = {
  // The id of the element that should receive focus, usually <main>.
  targetId: string;
};

// The first focusable element on every layout; visible only while focused.
export function SkipLink({ targetId }: SkipLinkProps) {
  return (
    <a href={`#${targetId}`} className={styles.skipLink}>
      Skip to main content
    </a>
  );
}
