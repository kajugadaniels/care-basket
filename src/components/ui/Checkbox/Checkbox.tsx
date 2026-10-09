import { useId, type ComponentProps, type ReactNode } from "react";
import { AlertCircleIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import styles from "./Checkbox.module.css";

type CheckboxProps = Omit<ComponentProps<"input">, "type" | "id" | "className" | "children"> & {
	label: ReactNode;
	hint?: string;
	error?: string;
	className?: string;
};

// A native checkbox drawn larger and in brand colors. The input itself stays focusable and in
// the accessibility tree, so keyboard use, form data, and checked announcements are unchanged.
export function Checkbox({ label, hint, error, className, ...inputProps }: CheckboxProps) {
	const id = useId();
	const hintId = hint ? `${id}-hint` : undefined;
	const errorId = error ? `${id}-error` : undefined;
	const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

	return (
		<div className={cx(styles.field, className)}>
			<label className={styles.option}>
				<span className={styles.control}>
					<input
						type="checkbox"
						aria-invalid={error ? true : undefined}
						aria-describedby={describedBy}
						className={cx(styles.input, error && styles.invalid)}
						{...inputProps}
					/>
					<Icon icon={Tick02Icon} size={20} className={styles.mark} />
				</span>
				<span className={styles.label}>{label}</span>
			</label>
			{hint ? (
				<p id={hintId} className={styles.hint}>
					{hint}
				</p>
			) : null}
			{error ? (
				<p id={errorId} className={styles.error}>
					<Icon icon={AlertCircleIcon} size={20} className={styles.errorIcon} />
					{error}
				</p>
			) : null}
		</div>
	);
}
