import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
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
	return <div className={styles.page}>
		{result.requests.length ? <ul className={styles.list}>
			{result.requests.map((request) => <li key={request.id} className={styles.panel}>
				<h2>{"displayName" in request ? request.displayName : formatDate(request.submittedAt)}</h2>
				{manager ? <p>{formatDate(request.submittedAt)}</p> : null}
				<p>{requestsCopy.count(request.itemCount)}</p>
				<p className={styles.status}>{requestsCopy.statuses[request.status]}</p>
				{"subtotal" in request ? <p>{requestsCopy.total}: {request.subtotal}</p> : null}
				<ActionLink href={`${base}/${request.id}`} variant="secondary" size={manager ? "md" : "lg"}>
					{manager ? requestsCopy.review : requestsCopy.view}
				</ActionLink>
			</li>)}
		</ul> : <div className={styles.panel}><h2>{requestsCopy.empty}</h2>
			<p>{manager ? requestsCopy.emptyHelp : requestsCopy.emptyHistory}</p>
			{manager ? null : <ActionLink href="/shop/products" size="lg">{requestsCopy.browse}</ActionLink>}
		</div>}
		{result.nextCursor ? <ActionLink href={`${base}?${query.toString()}`} variant="secondary">{requestsCopy.more}</ActionLink> : null}
	</div>;
}
