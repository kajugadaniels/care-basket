"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button/Button";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import { ProductCard } from "@/features/catalog/components/ProductCard/ProductCard";
import { ProductSelection } from "@/features/requests/components/DraftProvider/ProductSelection";
import { guideShoppingAction } from "../../actions";
import { assistantCopy as copy } from "../../copy";
import type { ShoppingGuideOrchestrationResult } from "../../types";
import styles from "./ShoppingGuide.module.css";

export function ShoppingGuide({ initialQuery }: { initialQuery: string }) {
	const toast = useToast();
	const [query, setQuery] = useState(initialQuery.slice(0, 80));
	const [result, setResult] = useState<ShoppingGuideOrchestrationResult | null>(null);
	const [error, setError] = useState("");
	const [pending, startTransition] = useTransition();
	const resultRef = useRef<HTMLHeadingElement>(null);
	const errorRef = useRef<HTMLParagraphElement>(null);
	const titleId = useId();
	const helpId = useId();

	useEffect(() => {
		if (result) resultRef.current?.focus();
	}, [result]);
	useEffect(() => {
		if (error) errorRef.current?.focus();
	}, [error]);

	function search(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;

		setError("");
		toast.prepareSound();
		startTransition(async () => {
			try {
				const response = await guideShoppingAction({ kind: "SEARCH", query, limit: 6 });
				if (response.ok) setResult(response.data);
				else { setError(response.error.message); toast.notify({ kind: "error", message: response.error.message }); }
			} catch {
				setError(copy.guideError); toast.notify({ kind: "error", message: copy.guideError });
			}
		});
	}

	const products = result?.kind === "CLARIFICATION" ? result.options : result?.products ?? [];
	const heading = result?.kind === "CLARIFICATION" ? result.question : copy.guideResults;

	return (
		<section className={styles.guide} aria-labelledby={titleId}>
			<header className={styles.heading}>
				<h2 id={titleId}>{copy.guideTitle}</h2>
				<p id={helpId}>{copy.guideHelp}</p>
			</header>
			<form className={styles.form} onSubmit={search}>
				<label className={styles.field}>
					{copy.guideLabel}
					<input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={80}
						required disabled={pending} autoComplete="off" aria-describedby={helpId} />
				</label>
				<Button type="submit" size="lg" loading={pending}>{copy.guideSearch}</Button>
			</form>
			{result ? (
				<div className={styles.results}>
					<h3 ref={resultRef} tabIndex={-1}>{heading}</h3>
					{products.length ? (
						<ul className={styles.grid} aria-label={heading}>
							{products.map((product) => (
								<li key={product.sku}>
									<ProductSelection product={product}>
										<ProductCard product={product} idPrefix="guide" />
									</ProductSelection>
								</li>
							))}
						</ul>
					) : result.kind === "PROPOSAL" ? (
						<p role="status">{copy.guideNoMatches({ query: result.requestedText })}</p>
					) : null}
				</div>
			) : null}
			{error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
		</section>
	);
}
