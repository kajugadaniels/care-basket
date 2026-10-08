import type { IconSvgElement } from "@hugeicons/react";
import {
  Mic01Icon,
  ShoppingBasket01Icon,
  UserCheck01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { Container } from "@/components/layout/Container/Container";
import { Icon } from "@/components/ui/Icon/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading/SectionHeading";
import { howItWorksCopy, type StepId } from "@/features/landing/copy";
import styles from "./HowItWorksSection.module.css";

const STEP_ICONS: Record<StepId, IconSvgElement> = {
  ask: Mic01Icon,
  prepare: ShoppingBasket01Icon,
  review: UserCheck01Icon,
  pay: Wallet01Icon,
};

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className={styles.section}>
      <Container>
        <SectionHeading
          id="how-it-works-title"
          title={howItWorksCopy.title}
          description={howItWorksCopy.description}
        />
        <ol role="list" className={styles.steps}>
          {howItWorksCopy.steps.map((step, index) => (
            <li key={step.id} className={styles.step}>
              <div className={styles.stepTop}>
                <span className={styles.icon}>
                  <Icon icon={STEP_ICONS[step.id]} size={32} />
                </span>
                <span className={styles.number}>Step {index + 1}</span>
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepText}>{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
