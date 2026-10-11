import {
	CancelCircleIcon,
	CheckmarkCircle02Icon,
	Clock01Icon,
	ShoppingBasket01Icon,
	Task01Icon,
	UserIcon,
} from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { formatDate, formatTime } from "@/lib/format";
import type { ManagerSummaryDto, RequestPage, RequestSummaryDto } from "../../types";
import { requestsCopy } from "../../copy";
import styles from "./RequestUi.module.css";
import inboxStyles from "./RequestList.module.css";

type RequestListProps =
	| { result: RequestPage<ManagerSummaryDto>; manager: true; status?: string }
	| { result: RequestPage<RequestSummaryDto>; manager?: false; status?: never };

function ManagerRequestRow({ request }: { request: ManagerSummaryDto }) {
	const isPending = request.status === "PENDING_REVIEW";
	const isClosed = request.status === "DECLINED" || request.status === "CANCELLED";
	const isPaid = request.status === "PAID";
	const action = isPending ? requestsCopy.review : requestsCopy.inboxView;
	const statusIcon = isPaid ? CheckmarkCircle02Icon : isClosed ? CancelCircleIcon : Clock01Icon;

	return (
		<li className={inboxStyles.row}>
			<div className={inboxStyles.member}>
				<span className={inboxStyles.avatar}><Icon icon={UserIcon} size={24} /></span>
				<div className={inboxStyles.memberDetails}>
					<h3>{request.displayName}</h3>
					<time dateTime={request.submittedAt} className={inboxStyles.metadata}>
						{formatDate(request.submittedAt)}
						<span>{requestsCopy.submittedTime({ time: formatTime(request.submittedAt) })}</span>
					</time>
					<span className={inboxStyles.metadata}>{requestsCopy.count(request.itemCount)}</span>
				</div>
			</div>
			<p className={cx(inboxStyles.status, isPending && inboxStyles.pending, isPaid && inboxStyles.paid, isClosed && inboxStyles.closed)}>
				<Icon icon={statusIcon} size={20} />
				{requestsCopy.statuses[request.status]}
			</p>
			<dl className={inboxStyles.total}>
				<dt>{requestsCopy.total}</dt>
				<dd>{request.subtotal}</dd>
			</dl>
			<div className={inboxStyles.action}>
				<ActionLink href={`/family/requests/${request.id}`} variant={isPending ? "primary" : "secondary"}>
					<span aria-hidden="true">{action}</span>
					<span className={inboxStyles.visuallyHidden}>{requestsCopy.inboxAction({ action, name: request.displayName })}</span>
				</ActionLink>
			</div>
		</li>
	);
}

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
					<ul className={inboxStyles.list}>
						{props.result.requests.map((request) => <ManagerRequestRow key={request.id} request={request} />)}
					</ul>
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
								<p className={cx(styles.status, request.status === "PAID" && styles.paidStatus)}>
									<Icon icon={request.status === "PAID" ? CheckmarkCircle02Icon : Task01Icon} size={24} />
									{requestsCopy.statuses[request.status]}
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
