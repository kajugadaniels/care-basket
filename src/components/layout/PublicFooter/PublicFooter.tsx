import Link from "next/link";
import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Brand } from "@/components/layout/Brand/Brand";
import { Container } from "@/components/layout/Container/Container";
import { Icon } from "@/components/ui/Icon/Icon";
import styles from "./PublicFooter.module.css";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#families", label: "For families" },
  { href: "/#commitments", label: "Our commitments" },
	{ href: "/data-sources", label: "Data sources" },
] as const;

export function PublicFooter() {
  return (
    <footer className={styles.footer}>
      <Container className={styles.inner}>
        <div>
          <Brand />
          <p className={styles.description}>
            CareBasket helps people ask for the groceries they need by speaking, typing, or
            choosing pictures. A trusted family member reviews each request and decides whether
            to pay.
          </p>
        </div>

        <nav aria-labelledby="footer-nav-title">
          <h2 id="footer-nav-title" className={styles.navTitle}>
            Explore
          </h2>
          <ul role="list" className={styles.links}>
            {FOOTER_LINKS.map((item) => (
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
            About this demo
          </h2>
          <p>
            CareBasket is being built for the PayPal AI Hackathon 2026. It is a demonstration
            in development, not a live service.
          </p>
          <p>
            When payments are added, they will use PayPal Sandbox test accounts, so no real money
            moves. The store, its prices, and delivery are simulated, and no real orders are
            placed. People and examples shown are fictional.
          </p>
          <p>CareBasket is an independent project and is not affiliated with or endorsed by PayPal.</p>
        </section>
      </Container>
    </footer>
  );
}
