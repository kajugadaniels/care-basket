import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { profilesCopy } from "@/features/profiles/copy";
import styles from "./page.module.css";

export default function MemberNotFound() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{profilesCopy.notFoundTitle}</h1>
      <p>{profilesCopy.notFoundText}</p>
      <ActionLink href="/family/members">{profilesCopy.back}</ActionLink>
    </div>
  );
}
