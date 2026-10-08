import Link from "next/link";
import type { ReactNode } from "react";
import type { IconSvgElement } from "@hugeicons/react";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import styles from "./ActionLink.module.css";

type ActionLinkProps = {
  href: string;
  className?: string;
  variant?: "primary" | "secondary" | "warning" | "destructive";
} & (
  | { size: "xs"; icon: IconSvgElement; children: string }
  | { size?: "sm" | "md" | "lg"; icon?: IconSvgElement; children: ReactNode }
);

const variantClasses = {
  primary: styles.primary,
  secondary: styles.secondary,
  warning: styles.warning,
  destructive: styles.destructive,
};

const sizeClasses = {
  xs: styles.iconOnly,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

// A navigation link styled as a pill button. Actions that change something use Button instead.
export function ActionLink({
  href,
  children,
  variant = "primary",
  size = "md",
  icon,
  className,
}: ActionLinkProps) {
  const classes = cx(
    styles.actionLink,
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
  const content = (
    <>
      <span className={size === "xs" ? styles.visuallyHidden : undefined}>{children}</span>
      {icon ? <Icon icon={icon} size={24} /> : null}
    </>
  );

  // In-page anchors stay native so the browser moves both scroll and focus to the target.
  if (href.startsWith("#")) {
    return (
      <a href={href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
