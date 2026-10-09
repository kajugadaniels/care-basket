import { Suspense } from "react";
import Form from "next/form";
import { Button } from "@/components/ui/Button/Button";
import { requireAdult } from "@/server/auth/require-adult";
import { RequestList } from "@/features/requests/components/RequestUi/RequestList";
import { RequestSkeleton } from "@/features/requests/components/RequestUi/RequestSkeleton";
import { requestsCopy } from "@/features/requests/copy";
import { REQUEST_STATUSES } from "@/features/requests/limits";
import { listFamilyRequests } from "@/features/requests/server/service";
import { parseRequestSearchParams, requestPageData } from "@/features/requests/server/page-data";
import styles from "@/features/requests/components/RequestUi/RequestUi.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export const metadata = { title: requestsCopy.inbox };
async function InboxContent({ searchParams }: Props) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const input = parseRequestSearchParams(await searchParams);
	const result = await requestPageData(() => listFamilyRequests(actor, input));
	return <div className={styles.page}>
		<Form action="/family/requests" prefetch={false} className={styles.actions}>
			<label htmlFor="request-status">{requestsCopy.filter}</label>
			<select key={input.status ?? ""} id="request-status" name="status" defaultValue={input.status ?? ""}>
				<option value="">{requestsCopy.allStatuses}</option>
				{REQUEST_STATUSES.map((status) => <option key={status} value={status}>{requestsCopy.statuses[status]}</option>)}
			</select><Button type="submit">{requestsCopy.filter}</Button>
		</Form>
		<p className={styles.notice}>{requestsCopy.demo}</p>
		<RequestList result={result} manager status={input.status} />
	</div>;
}
export default function InboxPage(props: Props) {
	return <div className={styles.page}><h1>{requestsCopy.inbox}</h1>
		<Suspense fallback={<RequestSkeleton />}><InboxContent {...props} /></Suspense>
	</div>;
}
