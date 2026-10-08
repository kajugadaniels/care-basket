import type { IconSvgElement } from "@hugeicons/react";
import {
  Clock01Icon,
  SmartPhone01Icon,
  TaskDone01Icon,
  UserAdd01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { setupPreviewCopy, type SetupStepId } from "@/features/family/copy";
import styles from "./SetupPreview.module.css";

const STEP_ICONS: Record<SetupStepId, IconSvgElement> = {
  profiles: UserAdd01Icon,
  devices: SmartPhone01Icon,
  requests: TaskDone01Icon,
  payments: Wallet01Icon,
};

// A read-only list of planned features. Deliberately has no buttons or links until they exist.
export function SetupPreview() {
  return (
    <section aria-labelledby="setup-preview-title" className={styles.section}>
      <hgroup>
        <h2 id="setup-preview-title" className={styles.title}>
          {setupPreviewCopy.title}
        </h2>
        <p className={styles.description}>{setupPreviewCopy.description}</p>
      </hgroup>
      <ol role="list" className={styles.list}>
        {setupPreviewCopy.items.map((item) => (
          <li key={item.id} className={styles.item}>
            <span className={styles.icon}>
              <Icon icon={STEP_ICONS[item.id]} size={24} />
            </span>
            <div className={styles.text}>
              <h3 className={styles.itemTitle}>{item.title}</h3>
              <p className={styles.itemDescription}>{item.description}</p>
            </div>
            <span className={styles.badge}>
              <Icon icon={Clock01Icon} size={20} />
              {setupPreviewCopy.comingSoon}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
