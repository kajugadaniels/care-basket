import Link from "next/link";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import { Icon } from "@/components/ui/Icon/Icon";
import { footerCopy as copy } from "./copy";
import styles from "./PublicFooter.module.css";

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div>
          <Brand />
          <p className={styles.description}>
            {copy.description}
          </p>
        </div>

        <nav aria-labelledby="footer-nav-title">
          <h2 id="footer-nav-title" className={styles.navTitle}>
            {copy.navigationTitle}
          </h2>
          <ul role="list" className={styles.links}>
            {copy.links.map((item) => (
              <li key={item.href}>
								<Link href={item.href} className={styles.link}>
									{item.label}
								</Link>
              </li>
            ))}
          </ul>
        </nav>

        <section aria-labelledby="demo-disclosure-title" className={styles.disclosure}>
          <h2 id="demo-disclosure-title" className={styles.disclosureTitle}>
            <Icon icon={InformationCircleIcon} size={24} />
            {copy.disclosureTitle}
          </h2>
          {copy.disclosures.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      </Container>
    </footer>
  );
}
