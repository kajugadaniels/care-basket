import Link from "next/link";
import { ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import styles from "./Brand.module.css";

type BrandProps = {
  // When set, the brand is a link (for example, to the home page).
  href?: string;
};

// CareBasket's own mark: a single-color wordmark, deliberately unlike PayPal's two-tone wordmark.
export function Brand({ href }: BrandProps) {
  const content = (
    <>
      <span className={styles.mark}>
        <Icon icon={ShoppingBasket01Icon} size={24} />
      </span>
      <span className={styles.name}>CareBasket</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cx(styles.brand, styles.link)}>
        {content}
      </Link>
    );
  }

  return <span className={styles.brand}>{content}</span>;
}
