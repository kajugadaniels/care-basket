import Form from "next/form";
import { ArrowDown01Icon, FilterHorizontalIcon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { requestsCopy as copy } from "../../copy";
import { REQUEST_STATUSES } from "../../limits";
import type { ManagerSummaryDto, RequestPage, RequestStatus } from "../../types";
import { RequestList } from "../RequestUi/RequestList";
import styles from "./ManagerInbox.module.css";

type ManagerInboxProps = {
	result: RequestPage<ManagerSummaryDto>;
	status?: RequestStatus;
};

export function ManagerInbox({ result, status }: ManagerInboxProps) {
	return (
		<div className={styles.inbox}>
			<Form action="/family/requests" prefetch={false} className={styles.toolbar}>
				<div className={styles.field}>
					<label htmlFor="request-status">
						<Icon icon={FilterHorizontalIcon} size={20} />
						{copy.statusFilter}
					</label>
					<div className={styles.control}>
						<select
							key={status ?? ""}
							id="request-status"
							name="status"
							defaultValue={status ?? ""}
							className={styles.select}
						>
							<option value="">{copy.allStatuses}</option>
							{REQUEST_STATUSES.map((value) => (
								<option key={value} value={value}>{copy.statuses[value]}</option>
							))}
						</select>
						<Icon icon={ArrowDown01Icon} size={20} className={styles.trailingIcon} />
					</div>
				</div>
				<Button type="submit">{copy.applyFilter}</Button>
				{status ? (
					<ActionLink href="/family/requests" variant="secondary">{copy.clearFilter}</ActionLink>
				) : null}
			</Form>

			<section className={styles.results} aria-labelledby="family-requests-title">
				<header className={styles.resultsHeader}>
					<div className={styles.heading}>
						<h2 id="family-requests-title">{copy.inboxResults}</h2>
						<p className={styles.caption}>{copy.inboxCount({ count: result.requests.length })}</p>
					</div>
					<span className={styles.caption}>{status ? copy.inboxFilteredOrder : copy.inboxOrder}</span>
				</header>
				<RequestList result={result} manager status={status} />
			</section>
		</div>
	);
}
