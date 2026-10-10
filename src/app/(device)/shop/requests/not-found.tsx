import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { requestsCopy } from "@/features/requests/copy";
import styles from "@/features/requests/components/RequestUi/RequestUi.module.css";

export default function RequestNotFound() {
	return <section className={`${styles.panel} ${styles.reading} ${styles.requester}`}>
		<h1>{requestsCopy.unavailable}</h1>
		<p className={styles.muted}>{requestsCopy.unavailableHelp}</p>
		<ActionLink href="/shop/requests" size="lg">{requestsCopy.back}</ActionLink>
	</section>;
}
