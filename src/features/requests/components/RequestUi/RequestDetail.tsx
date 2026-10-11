import { CheckmarkCircle02Icon, Task01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { formatDate } from "@/lib/format";
import type { ManagerDetailDto, RequestDetailDto } from "../../types";
import { requestsCopy } from "../../copy";
import { ManagerRequestDetail } from "../ManagerRequestDetail/ManagerRequestDetail";
import { CloseRequestDialog } from "./CloseRequestDialog";
import { RequestItem } from "./RequestItem";
import styles from "./RequestUi.module.css";

export function RequestDetail({ request }: { request: RequestDetailDto | ManagerDetailDto }) {
	if ("displayName" in request) return <ManagerRequestDetail request={request} />;

	return <div className={cx(styles.page, styles.requester, styles.reading)}>
		<header className={styles.header}>
			<h1>{requestsCopy.detailTitle}</h1>
			<ActionLink href="/shop/requests" variant="secondary">{requestsCopy.back}</ActionLink>
		</header>
		<section className={cx(styles.statusPanel, styles.panel)} aria-label={requestsCopy.statuses[request.status]}>
			<p className={styles.muted}>{formatDate(request.submittedAt)}</p>
			<p className={cx(styles.status, request.status === "PAID" && styles.paidStatus)}>
				<Icon icon={request.status === "PAID" ? CheckmarkCircle02Icon : Task01Icon} size={24} />
				{requestsCopy.statuses[request.status]}
			</p>
			<p>{requestsCopy.explanations[request.status]}</p>
			<p className={styles.muted}>{requestsCopy.deliveryNotice}</p>
		</section>
		<ul className={styles.list} aria-label={requestsCopy.listItems}>{request.items.map((item) => <li key={item.id} className={styles.panel}>
			<RequestItem product={item}><p>{requestsCopy.quantity}: {item.quantity}</p></RequestItem>
		</li>)}</ul>
		{request.editable ? <CloseRequestDialog requestId={request.id} revision={request.revision} />
			: <p className={styles.muted}>{requestsCopy.locked}</p>}
	</div>;
}
