"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import { updateRequestItemAction, removeRequestItemAction } from "../../actions";
import { requestsCopy } from "../../copy";
import { MAX_ITEM_QUANTITY } from "../../limits";
import { useRequestMutation } from "../../hooks/use-request-mutation";
import type { ManagerDetailDto } from "../../types";
import { RequestItem } from "../RequestUi/RequestItem";
import styles from "./ManagerBasket.module.css";

export function ManagerBasket({ request, children }: { request: ManagerDetailDto; children?: ReactNode }) {
	const id = useId();
	const { pending, error, saved, errorRef, run } = useRequestMutation();

	return (
		<div className={styles.layout}>
			<section className={styles.itemsPanel} aria-labelledby={`${id}-items-title`}>
				<header className={styles.itemsHeader}>
					<h2 id={`${id}-items-title`}>{requestsCopy.managerItems}</h2>
					<span className={styles.caption}>{requestsCopy.count(request.items.length)}</span>
				</header>
				{error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
				<p role="status" className={saved ? styles.success : styles.visuallyHidden}>
					{saved ? requestsCopy.saved : ""}
				</p>
				{request.items.length ? (
					<ul className={styles.list} aria-label={requestsCopy.managerItems}>
						{request.items.map((item) => (
							<li key={item.id} className={styles.row}>
								<RequestItem product={item} variant="manager">
									<p className={styles.origin}>
										<span className={item.origin === "SUGGESTED" ? styles.badge : undefined}>{requestsCopy.origins[item.origin]}</span>
										{item.isSubstitute ? <span className={styles.badge}>{requestsCopy.substitute}</span> : null}
									</p>
									{item.substitutionNote ? <p className={styles.note}>{item.substitutionNote}</p> : null}
									<dl className={styles.prices}>
										<div>
											<dt>{requestsCopy.unit}</dt>
											<dd>{item.unitPrice}</dd>
										</div>
										<div>
											<dt>{requestsCopy.line}</dt>
											<dd className={styles.lineTotal}>{item.lineTotal}</dd>
										</div>
									</dl>
								</RequestItem>
								{request.editable ? (
									<form key={`${item.id}:${request.revision}`} className={styles.actions} onSubmit={(event) => {
										event.preventDefault();
										const data = new FormData(event.currentTarget);
										run(() => updateRequestItemAction({
											requestId: request.id, revision: request.revision,
											itemId: item.id, quantity: Number(data.get("quantity")),
										}));
									}}>
										<div className={styles.quantity}>
											<label htmlFor={`${id}-${item.id}`}>{requestsCopy.quantity}</label>
											<input
												id={`${id}-${item.id}`}
												name="quantity"
												type="number"
												min={1}
												max={MAX_ITEM_QUANTITY}
												aria-label={`${requestsCopy.quantity}: ${item.displayName}`}
												step={1}
												defaultValue={item.quantity}
												required
												disabled={pending}
											/>
										</div>
										<Button type="submit" variant="secondary" loading={pending}>
											{pending ? requestsCopy.managerSaving : requestsCopy.save}
										</Button>
										<Button
											variant="destructive"
											disabled={pending || request.items.length === 1}
											aria-label={`${requestsCopy.remove}: ${item.displayName}`}
											onClick={() => run(() => removeRequestItemAction({
												requestId: request.id, revision: request.revision, itemId: item.id,
											}))}
										>
											{requestsCopy.remove}
										</Button>
									</form>
								) : <p className={styles.readOnlyQuantity}>{requestsCopy.quantity}: {item.quantity}</p>}
							</li>
						))}
					</ul>
				) : <p className={styles.empty}>{requestsCopy.managerEmptyItems}</p>}
			</section>

			<section className={styles.summary} aria-labelledby={`${id}-summary-title`}>
				<h2 id={`${id}-summary-title`}>{requestsCopy.managerSummary}</h2>
				<p className={styles.caption}>{requestsCopy.count(request.items.length)}</p>
				<dl className={styles.total}>
					<dt>{requestsCopy.total}</dt>
					<dd>{request.subtotal}</dd>
				</dl>
				{request.budget ? (
					<dl className={styles.budget}>
						<dt>{requestsCopy.budget}</dt>
						<dd>{request.budget}</dd>
					</dl>
				) : null}
				{request.editable ? <p className={styles.note}>{requestsCopy.managerReviewHelp}</p> : null}
				<div className={styles.summaryActions}>{children}</div>
			</section>
		</div>
	);
}
