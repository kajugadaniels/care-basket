"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ProductCard } from "@/features/catalog/components/ProductCard/ProductCard";
import { useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { changeDraft } from "@/features/requests/draft";
import { QuantityControl } from "@/features/requests/components/RequestUi/QuantityControl";
import { cx } from "@/lib/class-names";
import { assistantCopy as copy } from "../../copy";
import type { Proposal, ProposalItem } from "../../types";
import cardStyles from "@/features/requests/components/RequestUi/RequestUi.module.css";
import styles from "./ProposalReview.module.css";

type Props = { proposal: Proposal; onAccepted?(): void };

export function ProposalReview({ proposal, onAccepted }: Props) {
	const router = useRouter();
	const { draft, locked, change } = useDraft();
	const [items, setItems] = useState(proposal.items);
	const [selected, setSelected] = useState(new Set(proposal.items.filter((p) => p.origin === "REQUESTED" && !p.uncertain).map((p) => p.sku)));
	const [question, setQuestion] = useState(0);
	const [error, setError] = useState("");
	const errorRef = useRef<HTMLParagraphElement>(null);
	const questionRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
	useEffect(() => { questionRef.current?.focus(); }, [question]);
	const chosen = items.filter((p) => selected.has(p.sku));
	function modify(next: ProposalItem[], selection = selected) {
		setItems(next);
		setSelected(selection);
	}
	function accept() {
		if (locked) return;
		setError("");
		if (new Set([...draft.items, ...chosen].map((p) => p.sku)).size > 30) { setError(copy.error); return; }
		const addition = { type: "proposal" as const, items: chosen, inputMode: proposal.inputMode, inputText: proposal.inputText,
			sourceProof: proposal.sourceProof };
		try { changeDraft(draft, addition, "preview"); } catch { setError(copy.error); return; }
		change(addition);
		onAccepted?.();
		router.push("/shop/basket");
	}
	const current = proposal.questions[question];
	return <div className={styles.page}>
		{proposal.inputMode === "VOICE" ? <p className={styles.transcript}>{copy.transcript} {proposal.inputText}</p> : null}
		{current ? <section className={styles.panel} aria-labelledby="clarification-title">
			<h2 id="clarification-title" ref={questionRef} tabIndex={-1}>{current.question}</h2>
			<p className={styles.muted}>{copy.choiceHelp}</p>
			<ul className={styles.choiceGrid}>{current.options.map((option) => <li key={option.sku} className={cx(cardStyles.requester, cardStyles.selection)}>
				<ProductCard product={option} idPrefix={`clarification-${question}`} />
				<div className={cardStyles.controls}>
					<Button size="lg" className={styles.chooseButton} disabled={locked}
						aria-label={copy.chooseLabel({ name: option.displayName, size: option.sizeLabel })} onClick={() => {
							const existing = items.find((p) => p.sku === option.sku);
							modify(existing ? items.map((p) => p.sku === option.sku ? { ...p, quantity: Math.min(p.origin === "SUGGESTED" ? 6 : 20, p.quantity + option.quantity) } : p)
								: [...items, option], new Set([...selected, option.sku]));
							setQuestion(question + 1);
					}}>{copy.chooseProduct}</Button>
				</div>
			</li>)}</ul>
		</section> : null}
		{(["REQUESTED", "SUGGESTED"] as const).map((origin) => items.some((p) => p.origin === origin) ? <section key={origin} className={styles.group}>
			<h2>{origin === "REQUESTED" ? copy.requested : copy.suggested}</h2>
			<p className={styles.muted}>{origin === "REQUESTED" ? copy.selectedHelp : copy.suggestionHelp}</p>
			<ul className={styles.grid}>{items.filter((p) => p.origin === origin).map((item) => <li key={item.sku}
				className={cx(cardStyles.requester, cardStyles.selection, styles.item)} data-selected={selected.has(item.sku)}>
				<ProductCard product={item} idPrefix="proposal" />
				<div className={cardStyles.controls}>
					<label className={styles.check}>
						<input type="checkbox" checked={selected.has(item.sku)} disabled={locked}
							onChange={(event) => {
								const next = new Set(selected);
								if (event.target.checked) next.add(item.sku);
								else next.delete(item.sku);
								modify(items, next);
							}} />
						{item.uncertain ? copy.uncertain : copy.keepItem}: {item.displayName}
					</label>
					{item.isSubstitute ? <p>{item.substitutionNote}</p> : null}
					<QuantityControl name={item.displayName} quantity={item.quantity} disabled={locked}
						maxQuantity={item.origin === "SUGGESTED" ? 6 : 20}
						onChange={(quantity) => modify(items.map((p) => p.sku === item.sku ? { ...p, quantity: Math.min(item.origin === "SUGGESTED" ? 6 : 20, quantity) } : p))} />
					<Button variant="secondary" disabled={locked} aria-label={`${copy.remove}: ${item.displayName}`}
						onClick={() => modify(items.filter((p) => p.sku !== item.sku))}>{copy.remove}</Button>
				</div>
			</li>)}</ul>
		</section> : null)}
		{proposal.unrecognized.length ? <section className={styles.panel}><h2>{copy.uncaught}</h2>
			<ul>{proposal.unrecognized.map((phrase, index) => <li key={index}>{phrase}</li>)}</ul>
			<ActionLink href="/shop/products" size="lg" variant="secondary">{copy.pictures}</ActionLink></section> : null}
		{error ? <p role="alert" ref={errorRef} tabIndex={-1} className={styles.error}>{error}</p> : null}
		<div className={styles.actions}>
			<Button size="lg" disabled={!chosen.length || !!current || locked} onClick={accept}>{copy.accept}</Button>
		</div>
	</div>;
}
