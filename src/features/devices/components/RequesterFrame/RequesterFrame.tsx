import type { ReactNode } from "react";
import { cx } from "@/lib/class-names";
import { devicesCopy } from "../../copy";
import styles from "./RequesterFrame.module.css";

export function RequesterFrame({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={cx(styles.frame, wide && styles.wide)}>
    <header className={styles.brand}>CareBasket</header>
    <main className={styles.main}>{children}</main>
    <footer className={styles.footer}>{devicesCopy.disclaimer}</footer>
  </div>;
}
