"use client";

import { useEffect, useRef } from "react";
import { CancelCircleIcon, CheckmarkCircle02Icon, Invoice01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { formatDate, formatTime } from "@/lib/format";
import { checkoutCopy as copy } from "../../copy";
import type { CheckoutDto } from "../../types";
import styles from "./CheckoutPanel.module.css";

export function PaymentConfirmation({ checkout }: { checkout: CheckoutDto }) {
	const captured = checkout.state === "CAPTURED";
	const denied = checkout.state === "DENIED";
	const adjusted = checkout.state === "REFUNDED" || checkout.state === "REVERSED";
	const statusRef = useRef<HTMLParagraphElement>(null);
	useEffect(() => {
		if (captured || denied || adjusted) statusRef.current?.focus();
	}, [checkout.state, captured, denied, adjusted]);

	return <>
		{captured || denied ? <div key={`${checkout.paymentId}:${checkout.state}`}
			className={cx(styles.receiptGraphic, captured ? styles.successGraphic : styles.failureGraphic)} aria-hidden="true">
			<span className={styles.receipt}><Icon icon={Invoice01Icon} size={64} /></span>
			<span className={styles.seal}><Icon icon={captured ? CheckmarkCircle02Icon : CancelCircleIcon} size={32} /></span>
		</div> : null}
		<p ref={statusRef} tabIndex={-1} role="status" className={cx(styles.status,
			captured && styles.confirmed, denied && styles.denied)}>{copy.statuses[checkout.state]}</p>
		{captured ? <p className={styles.help}>{copy.confirmedHelp}</p> : null}
		{captured || adjusted ? <dl className={styles.reference}>
			<dt>{adjusted ? copy.historicalCapture : copy.confirmedAmount}</dt><dd>{checkout.amount} · USD</dd>
			{checkout.capturedAt ? <><dt>{copy.capturedOn}</dt><dd><time dateTime={checkout.capturedAt}>
				{formatDate(checkout.capturedAt)} · {formatTime(checkout.capturedAt)} UTC
			</time></dd></> : null}
			{checkout.captureId ? <><dt>{copy.captureReference}</dt><dd>{checkout.captureId}</dd></> : null}
		</dl> : null}
		{captured || adjusted ? <p className={styles.help}>{copy.delivery}</p> : null}
	</>;
}
