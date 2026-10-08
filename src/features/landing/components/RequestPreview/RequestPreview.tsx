import type { IconSvgElement } from "@hugeicons/react";
import {
  Bread01Icon,
  BananaIcon,
  EggsIcon,
  InformationCircleIcon,
  Mic01Icon,
  MilkBottleIcon,
  SentIcon,
  ShoppingBasket01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { previewCopy, type PreviewItemId } from "@/features/landing/copy";
import styles from "./RequestPreview.module.css";

const ITEM_ICONS: Record<PreviewItemId, IconSvgElement> = {
  milk: MilkBottleIcon,
  bread: Bread01Icon,
  bananas: BananaIcon,
  eggs: EggsIcon,
};

// A static illustration of the requester experience. Nothing here is interactive.
export function RequestPreview() {
  return (
    <figure className={styles.preview}>
      <div className={styles.card}>
        <p className={styles.badge}>
          <Icon icon={InformationCircleIcon} size={20} />
          {previewCopy.badge}
        </p>

        <div className={styles.request}>
          <span className={styles.requestIcon}>
            <Icon icon={Mic01Icon} size={24} />
          </span>
          <div>
            <p className={styles.requestLabel}>{previewCopy.requestLabel}</p>
            <blockquote className={styles.quote}>
              <p>&ldquo;{previewCopy.request}&rdquo;</p>
            </blockquote>
          </div>
        </div>

        <div className={styles.basket}>
          <p className={styles.basketTitle}>
            <Icon icon={ShoppingBasket01Icon} size={24} />
            {previewCopy.basketTitle}
          </p>
          <ul role="list" className={styles.items}>
            {previewCopy.items.map((item) => (
              <li key={item.id} className={styles.item}>
                <span className={styles.thumb}>
                  <Icon icon={ITEM_ICONS[item.id]} size={24} />
                </span>
                <span className={styles.itemText}>
                  <span className={styles.itemName}>{item.name}</span>
                  <span className={styles.itemDetail}>{item.detail}</span>
                </span>
                <span className={styles.quantity}>
                  <span className={styles.visuallyHidden}>{previewCopy.quantityLabel}: </span>
                  {item.quantity}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.status}>
          <Icon icon={SentIcon} size={24} />
          {previewCopy.status}
        </p>
      </div>
      <figcaption className={styles.caption}>{previewCopy.caption}</figcaption>
    </figure>
  );
}
