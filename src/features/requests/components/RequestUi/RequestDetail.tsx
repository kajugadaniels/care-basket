import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { formatDate } from "@/lib/format";
import type { ManagerDetailDto, RequestDetailDto } from "../../types";
import { requestsCopy } from "../../copy";
import { ManagerBasket } from "../ManagerBasket/ManagerBasket";
import { CloseRequestDialog } from "./CloseRequestDialog";
import { RequestItem } from "./RequestItem";
import styles from "./RequestUi.module.css";

export function RequestDetail({ request }: { request: RequestDetailDto | ManagerDetailDto }) {
	const manager = "displayName" in request;
	return <div className={`${styles.page} ${manager ? "" : styles.requester}`}>
		<header className={styles.header}>
			<h1>{manager ? requestsCopy.managerTitle(request.displayName) : requestsCopy.basketTitle}</h1>
			<ActionLink href={manager ? "/family/requests" : "/shop/requests"} variant="secondary">{requestsCopy.back}</ActionLink>
		</header>
		<p>{formatDate(request.submittedAt)}</p>
		<p className={styles.status}>{requestsCopy.statuses[request.status]}</p>
		<p>{requestsCopy.explanations[request.status]}</p>
		{manager ? <>
			<p className={styles.notice}>{requestsCopy.demo}</p>
			{request.inputText ? <section className={styles.panel}><h2>{requestsCopy.original}</h2><p>{request.inputText}</p></section> : null}
			<ManagerBasket request={request} />
		</> : <ul className={styles.list}>{request.items.map((item) => <li key={item.id} className={styles.panel}>
			<RequestItem product={item}><p>{requestsCopy.quantity}: {item.quantity}</p></RequestItem>
		</li>)}</ul>}
		{request.editable ? <CloseRequestDialog requestId={request.id} revision={request.revision} manager={manager} />
			: <p className={styles.muted}>{requestsCopy.locked}</p>}
	</div>;
}
