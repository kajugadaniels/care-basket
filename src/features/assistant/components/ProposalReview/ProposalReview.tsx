"use client";

import { useEffect, useRef, useState } from "react";
import { LoadMore } from "@/components/ui/LoadMore/LoadMore";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import { usePagedList } from "@/components/ui/LoadMore/use-paged-list";
import { ProductCard } from "@/features/catalog/components/ProductCard/ProductCard";
import { catalogCopy } from "@/features/catalog/copy";
import { useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { DraftSummary } from "@/features/requests/components/DraftProvider/DraftSummary";
import { ProductSelection } from "@/features/requests/components/DraftProvider/ProductSelection";
import { requestsCopy } from "@/features/requests/copy";
import { changeDraft } from "@/features/requests/draft";
import { assistantCopy as copy } from "../../copy";
import { loadReviewProductsAction } from "../../actions";
import type { Proposal, ProposalItem } from "../../types";
import { ShoppingGuide } from "../ShoppingGuide/ShoppingGuide";
import styles from "./ProposalReview.module.css";

type Props = { proposal: Proposal };

export function ProposalReview({ proposal }: Props) {
	const toast = useToast();
	const { draft, locked, change } = useDraft();
	const [error, setError] = useState("");
	const [announcement, setAnnouncement] = useState("");
	const errorRef = useRef<HTMLParagraphElement>(null);
	const announcedMissing = useRef(false);
	useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
	useEffect(() => {
		if (!proposal.unrecognized.length || announcedMissing.current) return;
		announcedMissing.current = true;
		toast.notify({ kind: "warning", message: copy.unrecognized({ phrases: proposal.unrecognized }) });
	}, [proposal.unrecognized, toast]);
	const choices = new Map<string, ProposalItem>();
	for (const item of [...proposal.items, ...proposal.questions.flatMap((entry) => entry.options)]) {
		const previous = choices.get(item.sku);
		if (!previous || previous.origin === "SUGGESTED" && item.origin === "REQUESTED") choices.set(item.sku, item);
	}
	const initialItems = [...choices.values()];
	const feed = usePagedList<ProposalItem, number>({
		items: initialItems.slice(0, 12),
		nextCursor: proposal.nextOffset ?? (initialItems.length > 12 ? 12 : null),
	}, async (offset) => {
		if (proposal.reviewId && proposal.nextOffset !== undefined) {
			return loadReviewProductsAction({ reviewId: proposal.reviewId, offset });
		}
		// An older in-memory proposal can reveal its existing choices without a server call.
		return { ok: true, data: { items: initialItems.slice(offset, offset + 12),
			nextCursor: offset + 12 < initialItems.length ? offset + 12 : null } };
	}, catalogCopy.feed.error);

	function add(item: ProposalItem, quantity: number) {
		if (locked || draft.items.some((existing) => existing.sku === item.sku)) return;
		setError("");
		// Preserve provenance; catalog controls must not turn suggestions into requested items.
		const addition = { type: "proposal" as const, items: [{ ...item, quantity }],
			inputMode: proposal.inputMode, inputText: proposal.inputText, sourceProof: proposal.sourceProof };
		try {
			changeDraft(draft, addition, "preview");
		} catch {
			setError(copy.addError);
			toast.notify({ kind: "error", message: copy.addError });
			return;
		}
		change(addition);
		setAnnouncement(requestsCopy.added(item.displayName));
	}

	function productCard(item: ProposalItem) {
		return <ProductSelection product={item} initialQuantity={item.quantity}
			maxQuantity={item.origin === "SUGGESTED" ? 6 : 20}
			onAdd={(quantity) => { add(item, quantity); }}>
			<ProductCard product={item} idPrefix="proposal" />
			{item.origin === "SUGGESTED" && item.suggestionReason ? <p className={styles.suggestionReason}>
				<strong>{copy.whySuggested}</strong> {item.suggestionReason}
			</p> : null}
			{item.uncertain ? <p className={styles.annotation}>{copy.uncertain}</p> : null}
			{item.isSubstitute ? <p className={styles.annotation}>{item.substitutionNote}</p> : null}
		</ProductSelection>;
	}

	return <div className={styles.workspace}>
		<div className={styles.page}>
			{proposal.inputMode === "VOICE" ? <p className={styles.transcript}>{copy.transcript} {proposal.inputText}</p> : null}
			{feed.items.length || proposal.unrecognized.length ? <div className={styles.results}>
				<p role="status" aria-live="polite" aria-atomic="true" className={styles.muted}>
					{catalogCopy.results({ count: feed.items.length })}
				</p>
				{proposal.unrecognized.length ? <p className={styles.unrecognized}>
					{copy.unrecognized({ phrases: proposal.unrecognized })}
				</p> : null}
			</div> : null}
			{proposal.unrecognized.length ? <ShoppingGuide initialQuery={proposal.unrecognized[0]} /> : null}
			{(["REQUESTED", "SUGGESTED"] as const).map((origin) => feed.items.some((item) => item.origin === origin) ? <section key={origin} className={styles.group}>
				<h2>{origin === "REQUESTED" ? copy.requested : copy.suggested}</h2>
				<p className={styles.muted}>{origin === "REQUESTED" ? copy.selectedHelp : copy.suggestionHelp}</p>
				<ul className={styles.grid}>{feed.items.filter((item) => item.origin === origin).map((item) => <li key={item.sku}>
					{productCard(item)}
				</li>)}</ul>
			</section> : null)}
			{feed.items.length || feed.hasMore ? <LoadMore {...feed} onLoad={feed.loadMore} labels={catalogCopy.feed} /> : null}
			<p role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
			{error ? <p role="alert" ref={errorRef} tabIndex={-1} className={styles.error}>{error}</p> : null}
		</div>
		<aside className={styles.listPanel} aria-label={requestsCopy.detailTitle}>
			<DraftSummary />
		</aside>
	</div>;
}
