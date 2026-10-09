"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button/Button";
import { updateRequestItemAction, removeRequestItemAction } from "../../actions";
import { requestsCopy } from "../../copy";
import { MAX_ITEM_QUANTITY } from "../../limits";
import { useRequestMutation } from "../../hooks/use-request-mutation";
import type { ManagerDetailDto } from "../../types";
import { RequestItem } from "../RequestUi/RequestItem";
import styles from "../RequestUi/RequestUi.module.css";

export function ManagerBasket({ request }: { request: ManagerDetailDto }) {
	const id = useId();
	const { pending, error, saved, errorRef, run } = useRequestMutation();
	return <div className={styles.page}>
		{error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
		<p role="status" className={saved ? styles.success : undefined}>{saved ? requestsCopy.saved : ""}</p>
		<ul className={styles.list}>{request.items.map((item) => <li key={item.id} className={styles.panel}>
			<RequestItem product={item}>
				<p>{requestsCopy.origins[item.origin]}{item.isSubstitute ? ` · ${requestsCopy.substitute}` : ""}</p>
				{item.substitutionNote ? <p>{item.substitutionNote}</p> : null}
				<p>{requestsCopy.unit}: {item.unitPrice}</p><p>{requestsCopy.line}: {item.lineTotal}</p>
				{request.editable ? <form key={`${item.id}:${request.revision}`} className={styles.actions}
					onSubmit={(event) => {
						event.preventDefault();
						const data = new FormData(event.currentTarget);
						run(() => updateRequestItemAction({ requestId: request.id, revision: request.revision,
							itemId: item.id, quantity: Number(data.get("quantity")) }));
					}}>
					<div className={styles.quantity}>
						<label htmlFor={`${id}-${item.id}`}>{requestsCopy.quantity}: {item.displayName}</label>
						<input id={`${id}-${item.id}`} name="quantity" type="number" min={1} max={MAX_ITEM_QUANTITY}
							step={1} defaultValue={item.quantity} required disabled={pending} />
					</div>
					<Button type="submit" loading={pending}>{requestsCopy.save}</Button>
					<Button variant="secondary" disabled={pending || request.items.length === 1}
						aria-label={`${requestsCopy.remove}: ${item.displayName}`} onClick={() => run(() => removeRequestItemAction({
							requestId: request.id, revision: request.revision, itemId: item.id,
						}))}>{requestsCopy.remove}</Button>
				</form> : <p>{requestsCopy.quantity}: {item.quantity}</p>}
			</RequestItem>
		</li>)}</ul>
		<p className={styles.total}>{requestsCopy.total}: {request.subtotal}</p>
		{request.budget ? <p>{requestsCopy.budget}: {request.budget}</p> : null}
	</div>;
}
