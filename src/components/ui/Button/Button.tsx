import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/class-names";
import styles from "./Button.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

// A real action. Navigation uses ActionLink instead.
export function Button({ type = "button", className, ...props }: ButtonProps) {
  return <button type={type} className={cx(styles.button, className)} {...props} />;
}
