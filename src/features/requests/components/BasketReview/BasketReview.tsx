"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { submitRequestAction } from "../../actions";
import { requestsCopy } from "../../copy";
import { useDraft } from "../DraftProvider/DraftProvider";
import { QuantityControl } from "../RequestUi/QuantityControl";
import { RequestItem } from "../RequestUi/RequestItem";
import styles from "../RequestUi/RequestUi.module.css";

export function BasketReview() {
	const { draft, locked, change, begin, finish } = useDraft();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState("");
	const [requestId, setRequestId] = useState<string | null>(null);
	const errorRef = useRef<HTMLParagraphElement>(null);
	const successRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
	useEffect(() => { if (requestId) successRef.current?.focus(); }, [requestId]);

	function send() {
		const input = begin();
		if (!input) return;
		setError("");
		startTransition(async () => {
			try {
				const result = await submitRequestAction(input);
				finish(input.clientRequestKey, result.ok);
				if (result.ok) setRequestId(result.data.requestId);
				else setError(result.error.message);
			} catch {
				finish(input.clientRequestKey, false);
				setError(requestsCopy.errors.INTERNAL);
			}
		});
	}
	if (requestId) return <section className={`${styles.panel} ${styles.requester}`}>
		<h1 ref={successRef} tabIndex={-1}>{requestsCopy.sent}</h1>
		<p>{requestsCopy.sentHelp}</p><p role="status">{requestsCopy.statuses.PENDING_REVIEW}</p>
		<ActionLink href={`/shop/requests/${requestId}`} size="lg">{requestsCopy.view}</ActionLink>
		<ActionLink href="/shop/products" variant="secondary" size="lg">{requestsCopy.browse}</ActionLink>
	</section>;
	return <div className={`${styles.page} ${styles.requester}`}>
		<h1>{requestsCopy.basketTitle}</h1><p>{requestsCopy.basketIntro}</p>
		<div className={styles.actions}><ActionLink href="/shop/products" variant="secondary" size="lg">{requestsCopy.browse}</ActionLink>
			<ActionLink href="/shop/requests" variant="secondary" size="lg">{requestsCopy.history}</ActionLink></div>
		{error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
		{draft.items.length ? <>
			<ul className={styles.list}>{draft.items.map((item) => <li key={item.sku} className={styles.panel}>
				<RequestItem product={item}>
					{item.origin === "SUGGESTED" ? <p>{requestsCopy.origins.SUGGESTED}</p> : null}
					{item.isSubstitute ? <p>{requestsCopy.substitute}</p> : null}
					<QuantityControl name={item.displayName} quantity={item.quantity} disabled={locked}
						maxQuantity={item.origin === "SUGGESTED" ? 6 : 20}
						onChange={(quantity) => change({ type: "quantity", sku: item.sku, quantity })} />
					<Button variant="secondary" disabled={locked} aria-label={`${requestsCopy.remove}: ${item.displayName}`}
						onClick={() => change({ type: "remove", sku: item.sku })}>{requestsCopy.remove}</Button>
				</RequestItem>
			</li>)}</ul>
			<div className={styles.actions}>
				<Button size="lg" loading={pending || locked} onClick={send}>{pending || locked ? requestsCopy.sending : requestsCopy.send}</Button>
				<Button size="lg" variant="secondary" disabled={locked} onClick={() => change({ type: "clear" })}>{requestsCopy.clear}</Button>
			</div>
		</> : <p className={styles.panel}>{requestsCopy.emptyBasket}</p>}
		<p role="status">{pending || locked ? requestsCopy.sending : ""}</p>
		<p className={styles.muted}>{requestsCopy.draftNotice}</p>
	</div>;
}
