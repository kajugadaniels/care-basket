"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ProductCard } from "@/features/catalog/components/ProductCard/ProductCard";
import { useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { ProductSelection } from "@/features/requests/components/DraftProvider/ProductSelection";
import { requestsCopy } from "@/features/requests/copy";
import { changeDraft } from "@/features/requests/draft";
import { assistantCopy as copy } from "../../copy";
import type { Proposal, ProposalItem } from "../../types";
import styles from "./ProposalReview.module.css";

type Props = { proposal: Proposal; onAccepted?(): void };

export function ProposalReview({ proposal, onAccepted }: Props) {
	const router = useRouter();
	const { draft, locked, change } = useDraft();
	const [question, setQuestion] = useState(0);
	const [resolvedItems, setResolvedItems] = useState<ProposalItem[]>([]);
	const [error, setError] = useState("");
	const [announcement, setAnnouncement] = useState("");
	const errorRef = useRef<HTMLParagraphElement>(null);
	const questionRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
	useEffect(() => { questionRef.current?.focus(); }, [question]);

	const current = proposal.questions[question];
	const pendingSkus = new Set(proposal.questions.slice(question).flatMap((entry) => entry.options.map((item) => item.sku)));
	const items = [...proposal.items, ...resolvedItems.filter((item) => !proposal.items.some((existing) => existing.sku === item.sku))]
		.filter((item) => !pendingSkus.has(item.sku));

	function add(item: ProposalItem, quantity: number): boolean {
		if (locked || draft.items.some((existing) => existing.sku === item.sku)) return false;
		setError("");
		// Preserve provenance; catalog controls must not turn suggestions into requested items.
		const addition = { type: "proposal" as const, items: [{ ...item, quantity }],
			inputMode: proposal.inputMode, inputText: proposal.inputText, sourceProof: proposal.sourceProof };
		try {
			changeDraft(draft, addition, "preview");
		} catch {
			setError(copy.addError);
			return false;
		}
		change(addition);
		setAnnouncement(requestsCopy.added(item.displayName));
		return true;
	}

	function nextQuestion(item: ProposalItem) {
		if (locked) return;
		setError("");
		setResolvedItems((previous) => [...previous.filter((existing) => existing.sku !== item.sku), item]);
		setQuestion((value) => value + 1);
	}

	function productCard(item: ProposalItem, idPrefix: string, clarification = false) {
		return <ProductSelection product={item} initialQuantity={item.quantity}
			maxQuantity={item.origin === "SUGGESTED" ? 6 : 20}
			onAdd={(quantity) => { if (add(item, quantity) && clarification) nextQuestion(item); }}
			selectedAction={clarification ? <Button size="lg" disabled={locked} onClick={() => nextQuestion(item)}
				aria-label={copy.chooseLabel({ name: item.displayName, size: item.sizeLabel })}>{copy.chooseProduct}</Button> : undefined}>
			<ProductCard product={item} idPrefix={idPrefix} />
			{item.uncertain ? <p className={styles.annotation}>{copy.uncertain}</p> : null}
			{item.isSubstitute ? <p className={styles.annotation}>{item.substitutionNote}</p> : null}
		</ProductSelection>;
	}

	function checkList() {
		if (locked || !draft.items.length) return;
		onAccepted?.();
		router.push("/shop/basket");
	}

	return <div className={styles.page}>
		{proposal.inputMode === "VOICE" ? <p className={styles.transcript}>{copy.transcript} {proposal.inputText}</p> : null}
		{current ? <section className={styles.panel} aria-labelledby="clarification-title">
			<h2 id="clarification-title" ref={questionRef} tabIndex={-1}>{current.question}</h2>
			<p className={styles.muted}>{copy.choiceHelp}</p>
			<ul className={styles.choiceGrid}>{current.options.map((option) => <li key={`${question}:${option.sku}`}>
				{productCard(option, `clarification-${question}`, true)}
			</li>)}</ul>
		</section> : null}
		{(["REQUESTED", "SUGGESTED"] as const).map((origin) => items.some((item) => item.origin === origin) ? <section key={origin} className={styles.group}>
			<h2>{origin === "REQUESTED" ? copy.requested : copy.suggested}</h2>
			<p className={styles.muted}>{origin === "REQUESTED" ? copy.selectedHelp : copy.suggestionHelp}</p>
			<ul className={styles.grid}>{items.filter((item) => item.origin === origin).map((item) => <li key={item.sku}>
				{productCard(item, "proposal")}
			</li>)}</ul>
		</section> : null)}
		{proposal.unrecognized.length ? <section className={styles.panel}><h2>{copy.uncaught}</h2>
			<ul>{proposal.unrecognized.map((phrase, index) => <li key={index}>{phrase}</li>)}</ul>
			<ActionLink href="/shop/products" size="lg" variant="secondary">{copy.pictures}</ActionLink></section> : null}
		<p role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
		{error ? <p role="alert" ref={errorRef} tabIndex={-1} className={styles.error}>{error}</p> : null}
		<div className={styles.actions}>
			<Button size="lg" disabled={!draft.items.length || locked} onClick={checkList}>{copy.basket}</Button>
		</div>
	</div>;
}
