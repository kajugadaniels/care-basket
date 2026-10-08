import type { IconSvgElement } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Image01Icon,
  KeyboardIcon,
  Mic01Icon,
} from "@hugeicons/core-free-icons";
import { Container } from "@/components/layout/Container/Container";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { RequestPreview } from "@/features/landing/components/RequestPreview/RequestPreview";
import { heroCopy, type WayToAskId } from "@/features/landing/copy";
import styles from "./HeroSection.module.css";

const WAY_ICONS: Record<WayToAskId, IconSvgElement> = {
  speak: Mic01Icon,
  type: KeyboardIcon,
  pictures: Image01Icon,
};

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className={styles.hero}>
      <Container className={styles.inner}>
        <div className={styles.content}>
          <p className={styles.status}>{heroCopy.status}</p>
          <h1 id="hero-title" className={styles.title}>
            {heroCopy.title}
          </h1>
          <p className={styles.description}>{heroCopy.description}</p>
          <ActionLink
            href="#how-it-works"
            size="md"
            icon={ArrowDown01Icon}
            className={styles.primaryAction}
          >
            {heroCopy.primaryAction}
          </ActionLink>
          <ul
            role="list"
            aria-label={heroCopy.waysToAskLabel}
            className={styles.ways}
          >
            {heroCopy.waysToAsk.map((way) => (
              <li key={way.id} className={styles.way}>
                <Icon
                  icon={WAY_ICONS[way.id]}
                  size={24}
                  className={styles.wayIcon}
                />
                {way.label}
              </li>
            ))}
          </ul>
        </div>
        <RequestPreview />
      </Container>
    </section>
  );
}
