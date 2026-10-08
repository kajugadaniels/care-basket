import Link from "next/link";
import type { ReactNode } from "react";
import type { IconSvgElement } from "@hugeicons/react";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import styles from "./ActionLink.module.css";

type ActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  size?: "md" | "lg";
  icon?: IconSvgElement;
  className?: string;
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
    variant === "secondary" && styles.secondary,
    size === "lg" && styles.lg,
    className,
  );
  const content = (
    <>
      <span>{children}</span>
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
