"use client";

import { Button } from "@/components/ui/Button/Button";
import { MAX_ITEM_QUANTITY } from "../../limits";
import { requestsCopy } from "../../copy";
import styles from "./RequestUi.module.css";

export function QuantityControl({ name, quantity, disabled, onChange, maxQuantity = MAX_ITEM_QUANTITY }: {
	name: string; quantity: number; disabled?: boolean; onChange: (quantity: number) => void; maxQuantity?: number;
}) {
	return <div className={styles.quantity} role="group" aria-label={`${requestsCopy.quantity}: ${name}`}>
		<Button variant="secondary" disabled={disabled || quantity <= 1} aria-label={requestsCopy.decrease(name)}
			onClick={() => onChange(quantity - 1)}>−</Button>
		<output aria-live="polite">{requestsCopy.quantity}: {quantity}</output>
		<Button variant="secondary" disabled={disabled || quantity >= Math.min(MAX_ITEM_QUANTITY, maxQuantity)} aria-label={requestsCopy.increase(name)}
			onClick={() => onChange(quantity + 1)}>+</Button>
	</div>;
}
