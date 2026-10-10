"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import type { CatalogProductDto } from "@/features/catalog/types";
import { MAX_ITEM_QUANTITY, MAX_REQUEST_ITEMS } from "../../limits";
import { requestsCopy } from "../../copy";
import { QuantityControl } from "../RequestUi/QuantityControl";
import { useDraft } from "./DraftProvider";
import styles from "../RequestUi/RequestUi.module.css";

type Props = {
	product: CatalogProductDto;
	children: ReactNode;
	initialQuantity?: number;
	maxQuantity?: number;
	onAdd?(quantity: number): void;
	selectedAction?: ReactNode;
};

export function ProductSelection({ product, children, initialQuantity = 1,
	maxQuantity = MAX_ITEM_QUANTITY, onAdd, selectedAction }: Props) {
	const { draft, locked, change } = useDraft();
	const [quantity, setQuantity] = useState(initialQuantity);
	const selected = draft.items.find((item) => item.sku === product.sku);
	const quantityLimit = selected
		? (selected.origin === "SUGGESTED" ? 6 : MAX_ITEM_QUANTITY)
		: maxQuantity;
	return <div className={`${styles.requester} ${styles.selection}`}>
		{children}
		<div className={styles.controls}>
			<QuantityControl name={product.displayName} quantity={selected?.quantity ?? quantity} disabled={locked} maxQuantity={quantityLimit}
				onChange={(value) => selected ? change({ type: "quantity", sku: product.sku, quantity: value }) : setQuantity(value)} />
			{selected ? selectedAction ?? <Button variant="secondary" disabled={locked} onClick={() => change({ type: "remove", sku: product.sku })}
				aria-label={`${requestsCopy.remove}: ${product.displayName}`}>{requestsCopy.remove}</Button>
				: <Button size="lg" disabled={locked || draft.items.length >= MAX_REQUEST_ITEMS}
					onClick={() => onAdd ? onAdd(quantity) : change({ type: "add", item: { ...product, quantity } })}>{requestsCopy.add}</Button>}
		</div>
	</div>;
}

