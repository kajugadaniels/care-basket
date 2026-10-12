"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckmarkCircle02Icon, ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/Button/Button";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { submitRequestAction } from "../../actions";
import { requestsCopy } from "../../copy";
import { useDraft } from "../DraftProvider/DraftProvider";
import { QuantityControl } from "../RequestUi/QuantityControl";
import { RequestItem } from "../RequestUi/RequestItem";
import styles from "../RequestUi/RequestUi.module.css";
import basketStyles from "./BasketReview.module.css";

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
	if (requestId) return <section className={`${styles.requester} ${basketStyles.confirmation}`}>
		<span className={basketStyles.confirmationIcon}><Icon icon={CheckmarkCircle02Icon} size={48} /></span>
		<div className={basketStyles.confirmationCopy}>
			<h1 ref={successRef} tabIndex={-1}>{requestsCopy.sent}</h1>
			<p>{requestsCopy.sentHelp}</p>
		</div>
		<p role="status" className={basketStyles.status}>{requestsCopy.statuses.PENDING_REVIEW}</p>
		<div className={basketStyles.confirmationActions}>
			<ActionLink href={`/shop/requests/${requestId}`} size="lg">{requestsCopy.view}</ActionLink>
			<ActionLink href="/shop/products" variant="secondary" size="lg">{requestsCopy.browse}</ActionLink>
		</div>
	</section>;
	return <div className={`${styles.page} ${styles.requester} ${basketStyles.page}`}>
		<header className={basketStyles.header}>
			<div className={styles.pageHeading}>
				<h1>{requestsCopy.basketTitle}</h1>
				{draft.items.length > 0 ? <p className={styles.muted}>{requestsCopy.basketIntro}</p> : null}
			</div>
			{draft.items.length > 0 ? <ActionLink href="/shop/products" variant="secondary" size="lg">{requestsCopy.browse}</ActionLink> : null}
		</header>
		{error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
		{draft.items.length > 0 ? <div className={basketStyles.layout}>
			<section className={basketStyles.groceries} aria-labelledby="basket-groceries-title">
				<header className={basketStyles.listHeader}>
					<h2 id="basket-groceries-title">{requestsCopy.listItems}</h2>
				</header>
				<ul className={basketStyles.list} aria-label={requestsCopy.listItems}>
					{draft.items.map((item) => <li key={item.sku} className={basketStyles.row}>
						<RequestItem product={item} headingLevel={3} className={basketStyles.product}>
							{item.origin === "SUGGESTED" ? <p className={basketStyles.badge}>{requestsCopy.origins.SUGGESTED}</p> : null}
							{item.isSubstitute ? <p className={basketStyles.badge}>{requestsCopy.substitute}</p> : null}
							<div className={basketStyles.controls}>
								<QuantityControl name={item.displayName} quantity={item.quantity} disabled={locked}
									maxQuantity={item.origin === "SUGGESTED" ? 6 : 20}
									onChange={(quantity) => change({ type: "quantity", sku: item.sku, quantity })} />
								<Button variant="secondary" disabled={locked} className={basketStyles.remove}
									aria-label={`${requestsCopy.remove}: ${item.displayName}`}
									onClick={() => change({ type: "remove", sku: item.sku })}>{requestsCopy.remove}</Button>
							</div>
						</RequestItem>
					</li>)}
				</ul>
			</section>
			<aside className={basketStyles.sendPanel} aria-labelledby="send-list-title">
				<div className={basketStyles.summaryHeading}>
					<Icon icon={ShoppingBasket01Icon} size={32} />
					<h2 id="send-list-title">{requestsCopy.readyToSend}</h2>
				</div>
				<p className={basketStyles.count}>{requestsCopy.draftCount(draft.items.length)}</p>
				<div className={basketStyles.sendActions}>
					<Button size="lg" loading={pending || locked} onClick={send}>{pending || locked ? requestsCopy.sending : requestsCopy.send}</Button>
					<Button size="lg" variant="secondary" disabled={locked} onClick={() => change({ type: "clear" })}>{requestsCopy.clear}</Button>
				</div>
			</aside>
		</div> : (
			<section className={basketStyles.empty} aria-labelledby="empty-shopping-list-title">
				<span className={basketStyles.emptyIcon}>
					<Icon icon={ShoppingBasket01Icon} size={48} />
				</span>
				<div className={basketStyles.emptyCopy}>
					<h2 id="empty-shopping-list-title">{requestsCopy.emptyBasket}</h2>
					<p>{requestsCopy.emptyBasketHelp}</p>
				</div>
				<ActionLink href="/shop/products" size="lg" className={basketStyles.emptyAction}>
					{requestsCopy.emptyBasketBrowse}
				</ActionLink>
			</section>
		)}
	</div>;
}
