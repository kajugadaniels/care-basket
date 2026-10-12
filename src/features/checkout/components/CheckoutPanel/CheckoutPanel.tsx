"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { cancelCheckoutAction, startCheckoutAction } from "../../actions";
import { checkoutCopy as copy } from "../../copy";
import type { CheckoutDto } from "../../types";
import styles from "./CheckoutPanel.module.css";

export function CheckoutPanel({ requestId, revision, editable, checkout }: {
	requestId: string; revision: number; editable: boolean; checkout: CheckoutDto | null;
}) {
	const id = useId();
	const [pending, transition] = useTransition();
	const [local, setLocal] = useState<{ revision: number; checkout: CheckoutDto | null } | null>(null);
	const [error, setError] = useState("");
	const [announcement, setAnnouncement] = useState("");
	const [operation, setOperation] = useState<"start" | "cancel">("start");
	const busy = useRef(false);
	const errorRef = useRef<HTMLParagraphElement>(null);
	const dialog = useRef<HTMLDialogElement>(null);
	const cancelTrigger = useRef<HTMLButtonElement>(null);
	const keep = useRef<HTMLButtonElement>(null);
	const current = local?.revision === revision ? local.checkout : checkout;
	useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

	function run(kind: "start" | "cancel") {
		if (busy.current || pending) { setError(copy.busy); return; }
		busy.current = true;
		setOperation(kind);
		setError("");
		setAnnouncement("");
		transition(async () => {
			try {
				if (kind === "start") {
					const result = await startCheckoutAction({ requestId, revision });
					if (!result.ok) { setError(result.error.message); return; }
					setLocal({ revision, checkout: result.data });
				} else if (current) {
					const result = await cancelCheckoutAction({ requestId, revision, paymentId: current.paymentId, confirmed: true });
					if (!result.ok) { setError(result.error.message); return; }
					setLocal({ revision, checkout: null });
					setAnnouncement(copy.cancelled);
				}
			} catch { setError(copy.errors.INTERNAL); }
			finally { dialog.current?.close(); busy.current = false; }
		});
	}

	return <section className={styles.panel} aria-labelledby={`${id}-title`}>
		<h3 id={`${id}-title`}>{copy.title}</h3>
		{current ? <>
			<p role="status" className={styles.status}>{current.state === "PREPARED" ? copy.prepared
				: current.state === "PREPARING" ? copy.recovering : copy.advanced}</p>
			<p className={styles.help}>{copy.locked}</p>
			{current.orderId ? <dl className={styles.reference}><dt>{copy.order}</dt><dd>{current.orderId}</dd></dl> : null}
			<p className={styles.help}>{copy.unavailable}</p>
		</> : <p className={styles.help}>{copy.intro}</p>}
		{error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
		{pending || announcement ? <p role="status" className={styles.help}>
			{pending ? operation === "start" ? copy.preparing : copy.cancelling : announcement}
		</p> : null}
		{(!current && editable) || current?.state === "PREPARING" ? <Button loading={pending && operation === "start"} disabled={pending} onClick={() => run("start")}>
			{pending && operation === "start" ? copy.preparing : current ? copy.retry : copy.prepare}
		</Button> : null}
		{current && current.state !== "REVIEW_REQUIRED" ? <Button ref={cancelTrigger} variant="secondary" disabled={pending}
			onClick={() => { dialog.current?.showModal(); keep.current?.focus(); }}>{copy.cancel}</Button> : null}
		<dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-cancel-title`} aria-describedby={`${id}-cancel-help`}
			onClose={() => cancelTrigger.current?.focus()} onCancel={(event) => { if (pending) event.preventDefault(); }}>
			<div className={styles.dialogContent}>
				<h2 id={`${id}-cancel-title`}>{copy.cancelTitle}</h2>
				<p id={`${id}-cancel-help`}>{copy.cancelHelp}</p>
				<div className={styles.actions}>
					<Button ref={keep} variant="secondary" disabled={pending} onClick={() => dialog.current?.close()}>{copy.keep}</Button>
					<Button variant="destructive" loading={pending} onClick={() => run("cancel")}>{pending ? copy.cancelling : copy.confirmCancel}</Button>
				</div>
			</div>
		</dialog>
	</section>;
}
