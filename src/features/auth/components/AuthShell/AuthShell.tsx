import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ClerkFailed, ClerkLoading } from "@clerk/nextjs";
import { Alert02Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Brand } from "@/components/layout/Brand/Brand";
import { Icon } from "@/components/ui/Icon/Icon";
import { authShellCopy } from "@/features/auth/copy";
import styles from "./AuthShell.module.css";

type AuthShellProps = {
  title: string;
  description: string;
  note?: string;
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
  // Clerk's prebuilt SignIn or SignUp component.
  children: ReactNode;
};

// Frames Clerk's prebuilt forms. Clerk handles every credential, code, and verification step.
export function AuthShell({
  title,
  description,
  note,
  switchPrompt,
  switchLabel,
  switchHref,
  children,
}: AuthShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Brand href="/" />
        <Link href="/" className={styles.backLink}>
          <Icon icon={ArrowLeft01Icon} size={20} />
          {authShellCopy.backToHome}
        </Link>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.description}>{description}</p>
          {note ? <p className={styles.note}>{note}</p> : null}
        </div>

        <div className={styles.form}>
          <ClerkLoading>
            <p className={styles.loading} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              {authShellCopy.loading}
            </p>
          </ClerkLoading>
          <ClerkFailed>
            <div className={styles.failed} role="alert">
              <Icon icon={Alert02Icon} size={24} className={styles.failedIcon} />
              <div>
                <p className={styles.failedTitle}>{authShellCopy.failedTitle}</p>
                <p>{authShellCopy.failedText}</p>
              </div>
            </div>
          </ClerkFailed>
          {/* Clerk reads the catch-all route on the client, so it renders behind Suspense. */}
          <Suspense fallback={null}>{children}</Suspense>
        </div>

        <p className={styles.switch}>
          {switchPrompt} <Link href={switchHref}>{switchLabel}</Link>
        </p>
      </main>
    </div>
  );
}
