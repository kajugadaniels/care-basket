import { Suspense } from "react";
import Image from "next/image";
import { PublicFooter } from "@/components/layout/PublicFooter/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader/PublicHeader";
import { AuthDialogOpener } from "@/features/auth/components/AuthDialogOpener/AuthDialogOpener";
import { LandingStory } from "@/features/landing/components/LandingStory/LandingStory";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <div className={styles.experience}>
      <div className={styles.backdrop} aria-hidden="true">
        <Image src="/landing/family-kitchen.jpg" alt="" fill sizes="100vw" preload className={styles.backgroundImage} />
      </div>
      <PublicHeader overImage />
      {/* tabIndex lets the skip link move focus here in every browser. */}
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <LandingStory />
      </main>
      <PublicFooter overImage />
      {/* Reads the query string, so it sits behind Suspense to keep the page's static shell. */}
      <Suspense fallback={null}>
        <AuthDialogOpener />
      </Suspense>
    </div>
  );
}
