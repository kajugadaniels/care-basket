"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import type { CatalogProductDto } from "@/features/catalog/types";
import { MAX_REQUEST_ITEMS } from "../../limits";
import { requestsCopy } from "../../copy";
import { QuantityControl } from "../RequestUi/QuantityControl";
import { useDraft } from "./DraftProvider";
import styles from "../RequestUi/RequestUi.module.css";

export function ProductSelection({ product, children }: { product: CatalogProductDto; children: ReactNode }) {
	const { draft, locked, change } = useDraft();
	const [quantity, setQuantity] = useState(1);
	const selected = draft.items.find((item) => item.sku === product.sku);
	return <div className={styles.requester}>
		{children}
		<div className={styles.controls}>
			<QuantityControl name={product.displayName} quantity={selected?.quantity ?? quantity} disabled={locked}
				onChange={(value) => selected ? change({ type: "quantity", sku: product.sku, quantity: value }) : setQuantity(value)} />
			{selected ? <Button variant="secondary" disabled={locked} onClick={() => change({ type: "remove", sku: product.sku })}
				aria-label={`${requestsCopy.remove}: ${product.displayName}`}>{requestsCopy.remove}</Button>
				: <Button size="lg" disabled={locked || draft.items.length >= MAX_REQUEST_ITEMS}
					onClick={() => change({ type: "add", item: { ...product, quantity } })}>{requestsCopy.add}</Button>}
		</div>
	</div>;
}

