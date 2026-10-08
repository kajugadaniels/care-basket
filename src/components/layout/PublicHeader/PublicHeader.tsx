import Link from "next/link";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import styles from "./PublicHeader.module.css";

// Only the landing page exists so far, so section links are in-page anchors.
// No sign-in or sign-up links until those routes are implemented.
const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#families", label: "For families" },
] as const;

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <Container className={styles.inner}>
        <Brand href="/" />
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
      </Container>
    </header>
  );
}
