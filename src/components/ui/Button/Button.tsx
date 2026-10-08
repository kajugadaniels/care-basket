import type { ComponentProps, ReactNode } from "react";
import type { IconSvgElement } from "@hugeicons/react";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "warning" | "destructive";
type ButtonSize = "xs" | "sm" | "md" | "lg";
type NativeButtonProps = Omit<ComponentProps<"button">, "children" | "className">;
type ButtonProps = NativeButtonProps & { variant?: ButtonVariant; className?: string } & (
  | { size: "xs"; icon: IconSvgElement; children: string }
  | { size?: Exclude<ButtonSize, "xs">; icon?: IconSvgElement; children: ReactNode }
);

const variantClasses: Record<ButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  warning: styles.warning,
  destructive: styles.destructive,
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: styles.iconOnly,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

// A real action. Navigation uses ActionLink instead.
// The xs size is icon-only visually, while its text remains the accessible name.
export function Button({
  type = "button",
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    >
      <span className={size === "xs" ? styles.visuallyHidden : undefined}>{children}</span>
      {icon ? <Icon icon={icon} size={24} /> : null}
    </button>
  );
}
