import { Suspense } from "react";
import { PublicFooter } from "@/components/layout/PublicFooter/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader/PublicHeader";
import { AuthDialogOpener } from "@/features/auth/components/AuthDialogOpener/AuthDialogOpener";
import { CommitmentsSection } from "@/features/landing/components/CommitmentsSection/CommitmentsSection";
import { FamiliesSection } from "@/features/landing/components/FamiliesSection/FamiliesSection";
import { HeroSection } from "@/features/landing/components/HeroSection/HeroSection";
import { HowItWorksSection } from "@/features/landing/components/HowItWorksSection/HowItWorksSection";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <>
      <PublicHeader />
      {/* tabIndex lets the skip link move focus here in every browser. */}
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <HeroSection />
        <HowItWorksSection />
        <FamiliesSection />
        <CommitmentsSection />
      </main>
      <PublicFooter />
      {/* Reads the query string, so it sits behind Suspense to keep the page's static shell. */}
      <Suspense fallback={null}>
        <AuthDialogOpener />
      </Suspense>
    </>
  );
}
