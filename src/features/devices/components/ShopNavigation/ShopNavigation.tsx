"use client";

import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { devicesCopy } from "../../copy";
import styles from "./ShopNavigation.module.css";

export function ShopNavigation() {
	const { draft } = useDraft();
	const count = draft.items.length;

	return (
		<nav aria-label={devicesCopy.shopNav} className={styles.navigation}>
			<ActionLink href="/shop/products" variant="secondary" size="sm">
				{devicesCopy.shopProducts}
			</ActionLink>
			<ActionLink href="/shop/basket" variant="secondary" size="sm">
				<span className={styles.listLabel} aria-label={`${devicesCopy.shopList}, ${devicesCopy.shopListCount(count)}`}>
					<span aria-hidden="true">{devicesCopy.shopList}</span>
					<span className={styles.count} aria-hidden="true">{count}</span>
				</span>
			</ActionLink>
		</nav>
	);
}
