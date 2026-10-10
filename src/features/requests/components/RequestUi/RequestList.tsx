import { CheckmarkCircle02Icon, Task01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { formatDate } from "@/lib/format";
import type { ManagerSummaryDto, RequestPage, RequestSummaryDto } from "../../types";
import { requestsCopy } from "../../copy";
import styles from "./RequestUi.module.css";

export function RequestList({ result, manager = false, status }: {
	result: RequestPage<RequestSummaryDto | ManagerSummaryDto>; manager?: boolean; status?: string;
}) {
	const base = manager ? "/family/requests" : "/shop/requests";
	const query = new URLSearchParams();
	if (result.nextCursor) query.set("after", result.nextCursor);
	if (status) query.set("status", status);
	return <div className={cx(styles.page, !manager && styles.requester)}>
		{result.requests.length ? <ul className={styles.list}>
			{result.requests.map((request) => <li key={request.id} className={cx(styles.panel, !manager && styles.historyCard)}>
				<h2>{"displayName" in request ? request.displayName : formatDate(request.submittedAt)}</h2>
				{manager ? <p>{formatDate(request.submittedAt)}</p> : null}
				<p>{requestsCopy.count(request.itemCount)}</p>
				<p className={cx(styles.status, request.status === "PAID" && styles.paidStatus)}>
					<Icon icon={request.status === "PAID" ? CheckmarkCircle02Icon : Task01Icon} size={24} />
					{requestsCopy.statuses[request.status]}
				</p>
				{"subtotal" in request ? <p>{requestsCopy.total}: {request.subtotal}</p> : null}
				<div className={styles.actions}><ActionLink href={`${base}/${request.id}`} variant="secondary" size={manager ? "md" : "lg"}>
					{manager ? requestsCopy.review : requestsCopy.view}
				</ActionLink></div>
			</li>)}
		</ul> : <div className={styles.panel}><h2>{requestsCopy.empty}</h2>
			<p>{manager ? requestsCopy.emptyHelp : requestsCopy.emptyHistory}</p>
			{manager ? null : <ActionLink href="/shop/products" size="lg">{requestsCopy.browse}</ActionLink>}
		</div>}
		{result.nextCursor ? <ActionLink href={`${base}?${query.toString()}`} variant="secondary">{requestsCopy.more}</ActionLink> : null}
	</div>;
}
