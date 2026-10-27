import {
	CheckmarkCircle02Icon,
	ShoppingBasket01Icon,
	Task01Icon,
} from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { formatDate } from "@/lib/format";
import type { ManagerSummaryDto, RequestPage, RequestSummaryDto } from "../../types";
import { requestsCopy } from "../../copy";
import { ManagerRequestGrid } from "../ManagerRequestGrid/ManagerRequestGrid";
import styles from "./RequestUi.module.css";
import inboxStyles from "./RequestList.module.css";

type RequestListProps =
	| { result: RequestPage<ManagerSummaryDto>; manager: true; status?: string }
	| { result: RequestPage<RequestSummaryDto>; manager?: false; status?: never };

export function RequestList(props: RequestListProps) {
	const { result, status } = props;
	const base = props.manager ? "/family/requests" : "/shop/requests";
	const query = new URLSearchParams();
	if (result.nextCursor) query.set("after", result.nextCursor);
	if (status) query.set("status", status);

	return (
		<div className={cx(styles.page, !props.manager && styles.requester)}>
			{props.manager ? (
				result.requests.length ? (
					<ManagerRequestGrid requests={props.result.requests} />
				) : (
					<div className={inboxStyles.empty}>
						<span className={inboxStyles.emptyIcon}><Icon icon={ShoppingBasket01Icon} size={32} /></span>
						<h3>{status ? requestsCopy.filteredEmpty : requestsCopy.empty}</h3>
						<p>{status ? requestsCopy.filteredEmptyHelp : requestsCopy.emptyHelp}</p>
					</div>
				)
			) : (
				result.requests.length ? (
					<ul className={styles.list}>
						{props.result.requests.map((request) => (
							<li key={request.id} className={cx(styles.panel, styles.historyCard)}>
								<h2>{formatDate(request.submittedAt)}</h2>
								<p>{requestsCopy.count(request.itemCount)}</p>
								<p className={cx(styles.status, request.status === "PAID" && !request.paymentState && styles.paidStatus)}>
									<Icon icon={request.status === "PAID" && !request.paymentState ? CheckmarkCircle02Icon : Task01Icon} size={24} />
									{request.paymentState ? requestsCopy.paymentUpdated : requestsCopy.statuses[request.status]}
								</p>
								<div className={styles.actions}>
									<ActionLink href={`${base}/${request.id}`} variant="secondary" size="lg">{requestsCopy.view}</ActionLink>
								</div>
							</li>
						))}
					</ul>
				) : (
					<div className={styles.panel}>
						<h2>{requestsCopy.empty}</h2>
						<p>{requestsCopy.emptyHistory}</p>
						<ActionLink href="/shop/products" size="lg">{requestsCopy.browse}</ActionLink>
					</div>
				)
			)}
			{result.nextCursor ? (
				<div className={props.manager ? inboxStyles.pagination : undefined}>
					<ActionLink href={`${base}?${query.toString()}`} variant="secondary">{requestsCopy.more}</ActionLink>
				</div>
			) : null}
		</div>
	);
}
