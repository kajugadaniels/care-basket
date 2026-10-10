"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button/Button";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ProductCard } from "@/features/catalog/components/ProductCard/ProductCard";
import { useDraft } from "@/features/requests/components/DraftProvider/DraftProvider";
import { changeDraft } from "@/features/requests/draft";
import { QuantityControl } from "@/features/requests/components/RequestUi/QuantityControl";
import { formatMoney } from "@/lib/format";
import { estimateShoppingBudgetAction } from "../../actions";
import { assistantCopy as copy } from "../../copy";
import type { Proposal, ProposalItem } from "../../types";
import styles from "./ProposalReview.module.css";

type Props = { proposal: Proposal; child: boolean; onBack(): void; onAccepted?(): void };

export function ProposalReview({ proposal, child, onBack, onAccepted }: Props) {
	const router = useRouter();
	const { draft, locked, change } = useDraft();
	const [items, setItems] = useState(proposal.items);
	const [selected, setSelected] = useState(new Set(proposal.items.filter((p) => p.origin === "REQUESTED" && !p.uncertain).map((p) => p.sku)));
	const [question, setQuestion] = useState(0);
	const [budget, setBudget] = useState<number | null>(child ? null : proposal.budgetMinor);
	const [confirmed, setConfirmed] = useState(false);
	const [line, setLine] = useState("");
	const [error, setError] = useState("");
	const [pending, startTransition] = useTransition();
	const errorRef = useRef<HTMLParagraphElement>(null);
	const questionRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
	useEffect(() => { questionRef.current?.focus(); }, [question]);
	const chosen = items.filter((p) => selected.has(p.sku));
	function modify(next: ProposalItem[], selection = selected) {
		setItems(next); setSelected(selection); setConfirmed(false); setLine("");
	}
	function accept() {
		if (locked || pending) return;
		setError("");
		if (new Set([...draft.items, ...chosen].map((p) => p.sku)).size > 30) { setError(copy.error); return; }
		const addition = { type: "proposal" as const, items: chosen, inputMode: proposal.inputMode, inputText: proposal.inputText,
			sourceProof: proposal.sourceProof, ...(confirmed && budget !== null ? { budgetMinor: budget, budgetConfirmed: true as const } : {}) };
		try { changeDraft(draft, addition, "preview"); } catch { setError(copy.error); return; }
		change(addition);
		onAccepted?.();
		router.push("/shop/basket");
	}
	const current = proposal.questions[question];
	return <div className={styles.page}>
		{proposal.local ? <p className={styles.notice}>{copy.fallback}</p> : null}
		{proposal.inputMode === "VOICE" ? <p className={styles.transcript}>{copy.transcript} {proposal.inputText}</p> : null}
		{current ? <section className={styles.panel} aria-labelledby="clarification-title">
			<h2 id="clarification-title" ref={questionRef} tabIndex={-1}>{current.question}</h2>
			<p className={styles.muted}>{copy.choiceHelp}</p>
			<ul className={styles.choiceGrid}>{current.options.map((option) => <li key={option.sku} className={styles.choice}>
				<ProductCard product={option} idPrefix={`clarification-${question}`} />
				<Button size="lg" variant="secondary" className={styles.chooseButton} disabled={locked || pending}
					aria-label={copy.chooseLabel({ name: option.displayName, size: option.sizeLabel })} onClick={() => {
					const existing = items.find((p) => p.sku === option.sku);
					modify(existing ? items.map((p) => p.sku === option.sku ? { ...p, quantity: Math.min(p.origin === "SUGGESTED" ? 6 : 20, p.quantity + option.quantity) } : p)
						: [...items, option], new Set([...selected, option.sku]));
					setQuestion(question + 1);
				}}>{copy.chooseProduct}</Button>
			</li>)}</ul>
			<ActionLink href="/shop/products" variant="secondary" size="lg" className={styles.escape}>{copy.none}</ActionLink>
		</section> : null}
		{(["REQUESTED", "SUGGESTED"] as const).map((origin) => items.some((p) => p.origin === origin) ? <section key={origin} className={styles.group}>
			<h2>{origin === "REQUESTED" ? copy.requested : copy.suggested}</h2>
			<p className={styles.muted}>{origin === "REQUESTED" ? copy.selectedHelp : copy.suggestionHelp}</p>
			<ul className={styles.grid}>{items.filter((p) => p.origin === origin).map((item) => <li key={item.sku}
				className={styles.item} data-selected={selected.has(item.sku)}>
				<ProductCard product={item} idPrefix="proposal" />
				<label className={styles.check}><input type="checkbox" checked={selected.has(item.sku)} disabled={locked || pending}
					onChange={(event) => {
						const next = new Set(selected); if (event.target.checked) next.add(item.sku); else next.delete(item.sku); modify(items, next);
					}} />{item.uncertain ? copy.uncertain : copy.keepItem}: {item.displayName}</label>
				{item.isSubstitute ? <p>{item.substitutionNote}</p> : null}
				<QuantityControl name={item.displayName} quantity={item.quantity} disabled={locked || pending}
					maxQuantity={item.origin === "SUGGESTED" ? 6 : 20}
					onChange={(quantity) => modify(items.map((p) => p.sku === item.sku ? { ...p, quantity: Math.min(item.origin === "SUGGESTED" ? 6 : 20, quantity) } : p))} />
				<Button variant="secondary" disabled={locked || pending} aria-label={`${copy.remove}: ${item.displayName}`}
					onClick={() => modify(items.filter((p) => p.sku !== item.sku))}>{copy.remove}</Button>
			</li>)}</ul>
		</section> : null)}
		{proposal.unrecognized.length ? <section className={styles.panel}><h2>{copy.uncaught}</h2>
			<ul>{proposal.unrecognized.map((phrase, index) => <li key={index}>{phrase}</li>)}</ul>
			<ActionLink href="/shop/products" size="lg" variant="secondary">{copy.pictures}</ActionLink></section> : null}
		{!child ? <section className={styles.budget}>
			<label className={styles.field}>{copy.budget}<select value={budget ?? ""} disabled={pending || locked} onChange={(event) => {
				setBudget(event.target.value ? Number(event.target.value) : null); setConfirmed(false); setLine("");
			}}><option value="">{copy.noBudget}</option>
				{[...new Set([1000, 2000, 3000, 5000, ...(proposal.budgetMinor ? [proposal.budgetMinor] : [])])].map((value) =>
					<option key={value} value={value}>{formatMoney(value, "USD")}</option>)}
			</select></label>
			{budget !== null ? <Button variant="secondary" disabled={!chosen.length || locked} loading={pending} onClick={() => {
				startTransition(async () => {
					try {
						const preview = changeDraft(draft, { type: "proposal", items: chosen,
							inputMode: proposal.inputMode, inputText: proposal.inputText }, "preview");
						const result = await estimateShoppingBudgetAction({ budgetMinor: budget,
							items: preview.items.map(({ sku, quantity }) => ({ sku, quantity })) });
						if (result.ok) { setLine(result.data.line); setConfirmed(true); } else setError(result.error.message);
					} catch { setError(copy.error); }
				});
			}}>{copy.confirmBudget}</Button> : null}
			{line ? <p role="status">{line}</p> : null}
		</section> : null}
		{error ? <p role="alert" ref={errorRef} tabIndex={-1} className={styles.error}>{error}</p> : null}
		<footer className={styles.summary}>
			<p>{copy.nothingSent}</p>
			<div className={styles.actions}>
				<Button size="lg" disabled={!chosen.length || !!current || locked || pending || (budget !== null && !confirmed)} onClick={accept}>{copy.accept}</Button>
				<Button size="lg" variant="secondary" disabled={pending || locked} onClick={onBack}>{copy.backToAssistant}</Button>
				<ActionLink href="/shop/products" size="lg" variant="secondary">{copy.pictures}</ActionLink>
			</div>
		</footer>
	</div>;
}
