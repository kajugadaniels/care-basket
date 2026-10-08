import type { ReactNode } from "react";
import { devicesCopy } from "../../copy";
import styles from "./RequesterFrame.module.css";

export function RequesterFrame({ children }: { children: ReactNode }) {
  return <div className={styles.frame}>
    <header className={styles.brand}>CareBasket</header>
    <main className={styles.main}>{children}</main>
    <footer className={styles.footer}>{devicesCopy.disclaimer}</footer>
  </div>;
}
