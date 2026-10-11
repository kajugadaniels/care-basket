"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CheckListIcon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { CATEGORY_ICONS } from "@/features/catalog/category-icons";
import { requestsCopy } from "../../copy";
import type { Draft } from "../../draft";
import type { DraftItem } from "../../types";
import { useDraft } from "./DraftProvider";
import styles from "./DraftSummary.module.css";

const PREVIEW_LIMIT = 4;

export function DraftSummary() {
	const { draft, message, locked, change } = useDraft();
	const headingRef = useRef<HTMLHeadingElement>(null);
	const [removed, setRemoved] = useState<{ item: DraftItem; draft: Draft } | null>(null);
	const items = draft.items.slice(0, PREVIEW_LIMIT);
	const remaining = draft.items.length - items.length;
	const canUndo = removed !== null && !draft.items.some((item) => item.sku === removed.item.sku);
	const feedback = message || (canUndo ? requestsCopy.draftRemoved({ name: removed.item.displayName }) : "");

	function undoRemoval() {
		if (!removed || !canUndo || locked) return;
		const previous = removed.draft;
		// Removing the last grocery clears the draft, including assistant provenance.
		const restored = !draft.items.length && previous.inputMode
			? change({ type: "proposal", items: [removed.item], inputMode: previous.inputMode,
				inputText: previous.inputText ?? "", sourceProof: previous.sourceProof,
				budgetMinor: previous.budgetMinor, budgetConfirmed: previous.budgetConfirmed })
			: change({ type: "add", item: removed.item });
		if (!restored) return;
		setRemoved(null);
		headingRef.current?.focus({ preventScroll: true });
	}

	return (
		<div className={styles.preview}>
			<header className={styles.header}>
				<span className={styles.icon}><Icon icon={CheckListIcon} size={24} /></span>
				<div className={styles.heading}>
					<h2 ref={headingRef} tabIndex={-1}>{requestsCopy.detailTitle}</h2>
					<p>{requestsCopy.draftCount(draft.items.length)}</p>
				</div>
			</header>

			{items.length > 0 ? (
				<ul className={styles.items} aria-label={requestsCopy.listItems} tabIndex={0}>
					{items.map((item) => (
						<li key={item.sku} className={styles.item}>
							<div className={styles.picture}>
								{item.imagePath ? (
									<Image src={item.imagePath} alt={`${item.displayName}, ${item.sizeLabel}`}
										width={64} height={64} className={styles.image} />
								) : <Icon icon={CATEGORY_ICONS[item.category]} size={32} />}
							</div>
							<div className={styles.details}>
								<p className={styles.name}>{item.displayName}</p>
								<p className={styles.size}>{item.sizeLabel}</p>
								<dl className={styles.quantity}>
									<dt>{requestsCopy.quantity}</dt><dd>{item.quantity}</dd>
								</dl>
								{item.origin === "SUGGESTED" ? <p className={styles.badge}>{requestsCopy.origins.SUGGESTED}</p> : null}
								{item.isSubstitute ? <p className={styles.badge}>{requestsCopy.substitute}</p> : null}
							</div>
						</li>
					))}
				</ul>
			) : <p className={styles.empty}>{requestsCopy.draftEmptyHelp}</p>}

			{remaining > 0 ? <p className={styles.more}>{requestsCopy.draftMore({ count: remaining })}</p> : null}
			{items.length > 0 ? <ActionLink href="/shop/basket" size="lg" className={styles.review}>{requestsCopy.basket}</ActionLink> : null}
			<p role="status" aria-live="polite" aria-atomic="true" className={styles.announcement}>{feedback}</p>
			{canUndo ? <Button variant="secondary" disabled={locked} className={styles.undo}
				onClick={undoRemoval}>{requestsCopy.undoRemove}</Button> : null}
		</div>
	);
}
