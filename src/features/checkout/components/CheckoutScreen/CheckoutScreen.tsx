import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { RequestItem } from "@/features/requests/components/RequestUi/RequestItem";
import { requestsCopy } from "@/features/requests/copy";
import type { ManagerDetailDto } from "@/features/requests/types";
import { checkoutCopy as copy } from "../../copy";
import type { CheckoutDto } from "../../types";
import { CheckoutPanel } from "../CheckoutPanel/CheckoutPanel";
import styles from "./CheckoutScreen.module.css";

export function CheckoutScreen({ request, checkout }: {
	request: ManagerDetailDto;
	checkout: CheckoutDto | null;
}) {
	const closed = request.status === "DECLINED" || request.status === "CANCELLED";
	const available = !closed && (request.editable || request.status === "AWAITING_PAYMENT" || checkout !== null);

	return <div className={styles.page}>
		<PageHeader title={copy.title} description={copy.pageDescription({ name: request.displayName })} />
		{available ? <div className={styles.layout}>
			<section className={styles.summary} aria-labelledby="checkout-summary-title">
				<header className={styles.summaryHeader}>
					<h2 id="checkout-summary-title">{copy.summary}</h2>
					<p>{requestsCopy.count(request.items.length)}</p>
				</header>
				<ul className={styles.list} aria-label={requestsCopy.managerItems}>
					{request.items.map((item) => <li key={item.id} className={styles.item}>
						<RequestItem product={item} variant="manager">
							<dl className={styles.itemDetails}>
								<div><dt>{requestsCopy.quantity}</dt><dd>{item.quantity}</dd></div>
								<div><dt>{requestsCopy.line}</dt><dd>{item.lineTotal}</dd></div>
							</dl>
						</RequestItem>
					</li>)}
				</ul>
				<dl className={styles.total}>
					<dt>{requestsCopy.total}</dt><dd>{request.subtotal}</dd>
				</dl>
			</section>
			<CheckoutPanel requestId={request.id} revision={request.revision} editable={request.editable} checkout={checkout} />
		</div> : <section className={styles.closed}>
			<p>{copy.closed}</p>
			<ActionLink href={`/family/requests/${request.id}`} variant="secondary">{copy.back}</ActionLink>
		</section>}
	</div>;
}
