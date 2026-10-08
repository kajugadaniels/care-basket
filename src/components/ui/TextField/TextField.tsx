import type { InputHTMLAttributes } from "react";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import styles from "./TextField.module.css";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name"> & {
  name: string;
  label: string;
  hint?: string;
  error?: string;
};

// A labelled text input with an optional hint and error, linked for screen readers.
export function TextField({ name, label, hint, error, className, ...inputProps }: TextFieldProps) {
  const inputId = `field-${name}`;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      <input
        id={inputId}
        name={name}
        type="text"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(styles.input, error && styles.inputInvalid)}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className={styles.error}>
          <Icon icon={AlertCircleIcon} size={20} className={styles.errorIcon} />
          {error}
        </p>
      ) : null}
    </div>
  );
}
