"use client";

import { useId, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { cancelRequestAction, declineRequestAction } from "../../actions";
import { requestsCopy } from "../../copy";
import { useRequestMutation } from "../../hooks/use-request-mutation";
import styles from "./RequestUi.module.css";

export function CloseRequestDialog({ requestId, revision, manager = false }: {
	requestId: string; revision: number; manager?: boolean;
}) {
	const id = useId();
	const dialog = useRef<HTMLDialogElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const keep = useRef<HTMLButtonElement>(null);
	const { pending, error, errorRef, run } = useRequestMutation();
	const label = manager ? requestsCopy.decline : requestsCopy.cancel;
	return <>
		<Button ref={trigger} variant="destructive" onClick={() => {
			dialog.current?.showModal(); keep.current?.focus();
		}}>{label}</Button>
		<dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`}
			onClose={() => trigger.current?.focus()} onCancel={(event) => { if (pending) event.preventDefault(); }}>
			<div className={styles.page}>
				<h2 id={`${id}-title`}>{manager ? requestsCopy.declineTitle : requestsCopy.cancelTitle}</h2>
				<p id={`${id}-help`}>{manager ? requestsCopy.declineHelp : requestsCopy.cancelHelp}</p>
				{error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
				<div className={styles.actions}>
					<Button ref={keep} variant="secondary" disabled={pending} onClick={() => dialog.current?.close()}>{requestsCopy.keep}</Button>
					<Button variant="destructive" loading={pending} onClick={() => run(
						() => (manager ? declineRequestAction : cancelRequestAction)({ requestId, revision, confirmed: true }),
						() => dialog.current?.close(),
					)}>{pending ? requestsCopy.closing : requestsCopy.confirm}</Button>
				</div>
				<p role="status">{pending ? requestsCopy.closing : ""}</p>
			</div>
		</dialog>
	</>;
}
