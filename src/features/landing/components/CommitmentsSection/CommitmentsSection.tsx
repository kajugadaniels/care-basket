import type { IconSvgElement } from "@hugeicons/react";
import {
  AccessIcon,
  SecurityCheckIcon,
  SecurityLockIcon,
  SquareLock02Icon,
} from "@hugeicons/core-free-icons";
import { Container } from "@/components/layout/Container/Container";
import { Icon } from "@/components/ui/Icon/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading/SectionHeading";
import { commitmentsCopy, type CommitmentId } from "@/features/landing/copy";
import styles from "./CommitmentsSection.module.css";

const COMMITMENT_ICONS: Record<CommitmentId, IconSvgElement> = {
  connections: SecurityLockIcon,
  payments: SecurityCheckIcon,
  simplicity: AccessIcon,
  privacy: SquareLock02Icon,
};

// Design commitments for features still being built, not claims about finished features.
export function CommitmentsSection() {
  return (
    <section id="commitments" aria-labelledby="commitments-title" className={styles.section}>
      <Container>
        <SectionHeading
          id="commitments-title"
          title={commitmentsCopy.title}
          description={commitmentsCopy.description}
        />
        <ul role="list" className={styles.grid}>
          {commitmentsCopy.items.map((item) => (
            <li key={item.id} className={styles.card}>
              <span className={styles.icon}>
                <Icon icon={COMMITMENT_ICONS[item.id]} size={24} />
              </span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardText}>{item.description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
