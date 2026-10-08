import type { ReactNode } from "react";
import { cx } from "@/lib/class-names";
import styles from "./Container.module.css";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

// Caps content at --content-max and applies the responsive page gutter.
export function Container({ children, className }: ContainerProps) {
  return <div className={cx(styles.container, className)}>{children}</div>;
}
