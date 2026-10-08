import { Suspense, type ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import { SkipLink } from "@/components/ui/SkipLink/SkipLink";
import { FamilyNav } from "@/features/family/components/FamilyNav/FamilyNav";
import { familyLayoutCopy } from "@/features/family/copy";
import { userButtonAppearance } from "@/lib/clerk/appearance";
import styles from "./layout.module.css";

// Layouts do not re-run on every navigation, so this layout shows no private data and
// every page under /family verifies the session itself (authentication.md § 3).
export default function FamilyLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className={styles.shell}>
      <SkipLink targetId="family-main" />
      <header className={styles.header}>
        <Container className={styles.headerInner}>
          <div className={styles.identity}>
            <Brand href="/family" />
            <span className={styles.area}>{familyLayoutCopy.areaLabel}</span>
          </div>
          <div className={styles.account}>
            <UserButton appearance={userButtonAppearance} />
          </div>
        </Container>
      </header>
      <Container className={styles.body}>
        {/* Dynamic profile IDs make usePathname suspend during prerendering. */}
        <Suspense fallback={<nav aria-label={familyLayoutCopy.navLabel} />}>
          <FamilyNav />
        </Suspense>
        <main id="family-main" tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </Container>
    </div>
  );
}
