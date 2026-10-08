import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/class-names";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

// A real action. Navigation uses ActionLink instead.
export function Button({ type = "button", variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, variant === "secondary" && styles.secondary, className)}
      {...props}
    />
  );
}
