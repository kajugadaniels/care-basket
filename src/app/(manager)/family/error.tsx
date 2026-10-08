"use client";

import { Button } from "@/components/ui/Button/Button";
import styles from "./error.module.css";

type FamilyErrorProps = {
  // Server errors arrive with a generic message; nothing from it is shown to the user.
  error: Error & { digest?: string };
  retry: () => void;
};

export default function FamilyError({ retry }: FamilyErrorProps) {
  return (
    <div className={styles.error} role="alert">
      <h1 className={styles.title}>Something went wrong</h1>
      <p className={styles.text}>We couldn&apos;t load your family space. Please try again.</p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
