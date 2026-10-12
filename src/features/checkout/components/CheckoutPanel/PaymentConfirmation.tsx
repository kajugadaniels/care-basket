import { formatDate, formatTime } from "@/lib/format";
import { checkoutCopy as copy } from "../../copy";
import type { CheckoutDto } from "../../types";
import styles from "./CheckoutPanel.module.css";

export function PaymentConfirmation({ checkout }: { checkout: CheckoutDto }) {
	const captured = checkout.state === "CAPTURED";
	const adjusted = checkout.state === "REFUNDED" || checkout.state === "REVERSED";
	return <>
		<p role="status" className={styles.status}>{copy.statuses[checkout.state]}</p>
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
