"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Toast, type ToastNotice } from "@/components/ui/Toast/Toast";
import { updateRequestItemAction, removeRequestItemAction } from "../../actions";
import { requestsCopy } from "../../copy";
import { MAX_ITEM_QUANTITY } from "../../limits";
import { useRequestMutation } from "../../hooks/use-request-mutation";
import type { ManagerDetailDto } from "../../types";
import { RequestItem } from "../RequestUi/RequestItem";
import styles from "./ManagerBasket.module.css";

export function ManagerBasket({ request, children }: { request: ManagerDetailDto; children?: ReactNode }) {
	const id = useId();
	const { pending, pendingKey, error, errorRef, run } = useRequestMutation();
	const [notice, setNotice] = useState<ToastNotice | null>(null);

	function confirm(message: string) {
		setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
	}

	return (
		<div className={styles.layout}>
			<section className={styles.itemsPanel} aria-labelledby={`${id}-items-title`}>
				<header className={styles.itemsHeader}>
					<h2 id={`${id}-items-title`}>{requestsCopy.managerItems}</h2>
					<span className={styles.caption}>{requestsCopy.count(request.items.length)}</span>
				</header>
				{error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
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
									<form className={styles.actions} onSubmit={(event) => {
										event.preventDefault();
										if (pending) return;
										const data = new FormData(event.currentTarget);
										const quantity = Number(data.get("quantity"));
										setNotice(null);
										run(() => updateRequestItemAction({
											requestId: request.id, revision: request.revision,
											itemId: item.id, quantity,
										}), () => confirm(requestsCopy.managerQuantitySaved({ name: item.displayName, quantity })), `save:${item.id}`);
									}}>
										<div className={styles.quantity}>
											<label htmlFor={`${id}-${item.id}`}>{requestsCopy.quantity}</label>
											<input
												key={`${item.id}:${item.quantity}`}
												id={`${id}-${item.id}`}
												name="quantity"
												type="number"
												min={1}
												max={MAX_ITEM_QUANTITY}
												aria-label={`${requestsCopy.quantity}: ${item.displayName}`}
												step={1}
												defaultValue={item.quantity}
												required
												disabled={pendingKey === `save:${item.id}` || pendingKey === `remove:${item.id}`}
											/>
										</div>
										<Button type="submit" variant="secondary" disabled={pending} loading={pendingKey === `save:${item.id}`}>
											{pendingKey === `save:${item.id}` ? requestsCopy.managerSaving : requestsCopy.save}
										</Button>
										<Button
											variant="destructive"
											loading={pendingKey === `remove:${item.id}`}
											disabled={pending || request.items.length === 1}
											aria-label={`${requestsCopy.remove}: ${item.displayName}`}
											onClick={() => {
												setNotice(null);
												run(() => removeRequestItemAction({
													requestId: request.id, revision: request.revision, itemId: item.id,
												}), () => confirm(requestsCopy.managerItemRemoved({ name: item.displayName })), `remove:${item.id}`);
											}}
										>
											{pendingKey === `remove:${item.id}` ? requestsCopy.managerRemoving : requestsCopy.remove}
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
			<Toast notice={notice} dismissLabel={requestsCopy.dismissSuccess} onDismiss={() => setNotice(null)} />
		</div>
	);
}
