"use client";

import {
	CancelCircleIcon,
	CheckmarkCircle02Icon,
	Clock01Icon,
	UserIcon,
} from "@hugeicons/core-free-icons";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { ManagerDataGrid } from "@/components/ui/ManagerDataGrid/ManagerDataGrid";
import { cx } from "@/lib/class-names";
import { formatDate, formatTime } from "@/lib/format";
import { requestsCopy as copy } from "../../copy";
import type { ManagerSummaryDto } from "../../types";
import styles from "./ManagerRequestGrid.module.css";

function requestPresentation(request: ManagerSummaryDto) {
	const isPending = request.status === "PENDING_REVIEW";
	const isClosed = request.status === "DECLINED" || request.status === "CANCELLED";
	const isPaid = request.status === "PAID" && !request.paymentState;
	return {
		action: isPending ? copy.review : copy.inboxView,
		isClosed,
		isPaid,
		isPending,
		status: request.paymentState ? copy.paymentUpdated : copy.statuses[request.status],
		statusIcon: isPaid ? CheckmarkCircle02Icon : isClosed ? CancelCircleIcon : Clock01Icon,
	};
}

function RequesterCell({ data }: ICellRendererParams<ManagerSummaryDto>) {
	if (!data) return null;
	return (
		<div className={styles.gridMember}>
			<span className={styles.smallAvatar}><Icon icon={UserIcon} size={20} /></span>
			<strong>{data.displayName}</strong>
		</div>
	);
}

function StatusCell({ data }: ICellRendererParams<ManagerSummaryDto>) {
	if (!data) return null;
	const presentation = requestPresentation(data);
	return (
		<span className={cx(styles.status, presentation.isPending && styles.pending,
			presentation.isPaid && styles.paid, presentation.isClosed && styles.closed)}>
			<Icon icon={presentation.statusIcon} size={20} />
			{presentation.status}
		</span>
	);
}

function SubmittedCell({ data }: ICellRendererParams<ManagerSummaryDto>) {
	if (!data) return null;
	return (
		<time dateTime={data.submittedAt} className={styles.gridDate}>
			<span>{formatDate(data.submittedAt)}</span>
			<span>{copy.submittedTime({ time: formatTime(data.submittedAt) })}</span>
		</time>
	);
}

function RequestActionCell({ data }: ICellRendererParams<ManagerSummaryDto>) {
	if (!data) return null;
	const { action, isPending } = requestPresentation(data);
	return (
		<ActionLink href={`/family/requests/${data.id}`} size="sm" variant={isPending ? "primary" : "secondary"}>
			<span aria-hidden="true">{action}</span>
			<span className={styles.visuallyHidden}>{copy.inboxAction({ action, name: data.displayName })}</span>
		</ActionLink>
	);
}

function subtotalValue(value: string | null | undefined) {
	return Number.parseFloat((value ?? "").replace(/[^\d.-]/g, "")) || 0;
}

const COLUMNS: ColDef<ManagerSummaryDto>[] = [
	{ field: "displayName", headerName: copy.inboxColumns.requester, flex: 1.2, minWidth: 180, cellRenderer: RequesterCell },
	{ colId: "status", headerName: copy.inboxColumns.status, flex: 1.2, minWidth: 170,
		valueGetter: ({ data }) => data ? requestPresentation(data).status : "", cellRenderer: StatusCell },
	{ field: "itemCount", headerName: copy.inboxColumns.products, flex: 0.7, minWidth: 110,
		valueFormatter: ({ value }) => copy.count(Number(value ?? 0)) },
	{ field: "subtotal", headerName: copy.inboxColumns.total, flex: 0.7, minWidth: 110,
		cellClass: styles.money, comparator: (first, second) => subtotalValue(first) - subtotalValue(second) },
	{ field: "submittedAt", headerName: copy.inboxColumns.submitted, flex: 1.2, minWidth: 160, cellRenderer: SubmittedCell },
	{ colId: "action", headerName: copy.inboxColumns.action, flex: 0.9, minWidth: 150, sortable: false,
		cellRenderer: RequestActionCell, cellClass: styles.actionCell },
];

function RequestCard({ request }: { request: ManagerSummaryDto }) {
	const presentation = requestPresentation(request);
	return (
		<li className={styles.row}>
			<div className={styles.member}>
				<span className={styles.avatar}><Icon icon={UserIcon} size={24} /></span>
				<div className={styles.memberDetails}>
					<h3>{request.displayName}</h3>
					<time dateTime={request.submittedAt} className={styles.metadata}>
						{formatDate(request.submittedAt)}
						<span>{copy.submittedTime({ time: formatTime(request.submittedAt) })}</span>
					</time>
					<span className={styles.metadata}>{copy.count(request.itemCount)}</span>
				</div>
			</div>
			<p className={cx(styles.status, presentation.isPending && styles.pending,
				presentation.isPaid && styles.paid, presentation.isClosed && styles.closed)}>
				<Icon icon={presentation.statusIcon} size={20} />
				{presentation.status}
			</p>
			<dl className={styles.total}>
				<dt>{copy.total}</dt>
				<dd>{request.subtotal}</dd>
			</dl>
			<div className={styles.action}>
				<ActionLink href={`/family/requests/${request.id}`} variant={presentation.isPending ? "primary" : "secondary"}>
					<span aria-hidden="true">{presentation.action}</span>
					<span className={styles.visuallyHidden}>{copy.inboxAction({ action: presentation.action, name: request.displayName })}</span>
				</ActionLink>
			</div>
		</li>
	);
}

export function ManagerRequestGrid({ requests }: { requests: ManagerSummaryDto[] }) {
	return (
		<ManagerDataGrid
			columns={COLUMNS}
			label={copy.inboxGridLabel}
			mobileFallback={<ul className={styles.list}>{requests.map((request) => <RequestCard key={request.id} request={request} />)}</ul>}
			noMatches={copy.inboxNoMatches}
			rows={requests}
			searchLabel={copy.inboxSearch}
			searchPlaceholder={copy.inboxSearchPlaceholder}
		/>
	);
}
