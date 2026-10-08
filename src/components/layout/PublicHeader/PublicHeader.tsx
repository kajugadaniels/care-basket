import Link from "next/link";
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

// Only the landing page uses this header so far, so section links are in-page anchors.
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#families", label: "For families" },
] as const;

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <SkipLink targetId="main-content" />
      <Container className={styles.inner}>
        <div className={styles.brand}>
          <Brand href="/" />
        </div>

        <nav aria-label="Main" className={styles.nav}>
          <ul role="list" className={styles.list}>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                {item.href.startsWith("#") ? (
                  <a href={item.href} className={styles.link}>
                    {item.label}
                  </a>
                ) : (
                  <Link href={item.href} className={styles.link}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

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
