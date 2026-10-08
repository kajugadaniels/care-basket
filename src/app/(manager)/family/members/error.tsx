"use client";

import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { profilesCopy } from "@/features/profiles/copy";
import styles from "./page.module.css";

export default function MembersError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className={styles.page} role="alert">
      <h1 className={styles.title}>{profilesCopy.errorTitle}</h1>
      <p>{profilesCopy.errorText}</p>
      <div className={styles.actions}><Button onClick={retry}>{profilesCopy.retry}</Button><ActionLink href="/family" variant="secondary">{profilesCopy.dashboard}</ActionLink></div>
    </div>
  );
}
