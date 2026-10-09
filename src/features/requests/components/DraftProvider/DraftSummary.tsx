"use client";

import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { requestsCopy } from "../../copy";
import { useDraft } from "./DraftProvider";
import styles from "../RequestUi/RequestUi.module.css";

export function DraftSummary() {
	const { draft, message } = useDraft();
	return <div className={`${styles.panel} ${styles.requester}`}>
		<div className={styles.header}>
			<p>{requestsCopy.draftCount(draft.items.length)}</p>
			<ActionLink href="/shop/basket" size="lg">{requestsCopy.basket}</ActionLink>
		</div>
		<p role="status">{message}</p>
	</div>;
}
