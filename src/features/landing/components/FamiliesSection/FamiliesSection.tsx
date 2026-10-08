import type { IconSvgElement } from "@hugeicons/react";
import { CheckmarkCircle02Icon, ShieldUserIcon, UserIcon } from "@hugeicons/core-free-icons";
import { Container } from "@/components/layout/Container/Container";
import { Icon } from "@/components/ui/Icon/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading/SectionHeading";
import { familiesCopy, type AudienceId } from "@/features/landing/copy";
import styles from "./FamiliesSection.module.css";

const AUDIENCE_ICONS: Record<AudienceId, IconSvgElement> = {
  requester: UserIcon,
  manager: ShieldUserIcon,
};

export function FamiliesSection() {
  return (
    <section id="families" aria-labelledby="families-title" className={styles.section}>
      <Container>
        <SectionHeading
          id="families-title"
          title={familiesCopy.title}
          description={familiesCopy.description}
        />
        <div className={styles.grid}>
          {familiesCopy.audiences.map((audience) => (
            <div key={audience.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.icon}>
                  <Icon icon={AUDIENCE_ICONS[audience.id]} size={32} />
                </span>
                <hgroup>
                  <p className={styles.role}>{audience.role}</p>
                  <h3 className={styles.cardTitle}>{audience.title}</h3>
                </hgroup>
              </div>
              <p className={styles.summary}>{audience.summary}</p>
              <ul role="list" className={styles.points}>
                {audience.points.map((point) => (
                  <li key={point} className={styles.point}>
                    <Icon icon={CheckmarkCircle02Icon} size={24} className={styles.check} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
