import { Suspense } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { SkipLink } from "@/components/ui/SkipLink/SkipLink";
import { userButtonAppearance } from "@/lib/clerk/appearance";
import { signInDialogOptions, signUpDialogOptions } from "@/lib/clerk/auth-dialogs";
import styles from "./PublicHeader.module.css";

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <SkipLink targetId="main-content" />
      <Container className={styles.inner}>
        <div className={styles.brand}>
          <Brand href="/" />
        </div>

        {/* The session is read at request time, so these parts stream in behind Suspense.
            <Show> only controls visibility; /family pages verify the session on the server. */}
        <div className={styles.actions}>
          <Suspense fallback={<div className={styles.actionsPlaceholder} aria-hidden="true" />}>
            <Show when="signed-in" fallback={<SignedOutActions />}>
              <ActionLink href="/family" className={styles.action}>
                My Family
              </ActionLink>
            </Show>
          </Suspense>
        </div>

        <div className={styles.account}>
          <Suspense fallback={null}>
            <Show when="signed-in">
              <UserButton appearance={userButtonAppearance} />
            </Show>
          </Suspense>
        </div>
      </Container>
    </header>
  );
}

// Real buttons: they open Clerk's sign-in and sign-up dialogs on the current page.
function SignedOutActions() {
  return (
    <>
      <SignInButton mode="modal" {...signInDialogOptions}>
        <Button variant="secondary" aria-haspopup="dialog" className={styles.action}>
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal" {...signUpDialogOptions}>
        <Button aria-haspopup="dialog" className={styles.action}>
          Get Started
        </Button>
      </SignUpButton>
    </>
  );
}
