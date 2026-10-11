import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { requireAdult } from "@/server/auth/require-adult";
import { ManagerInbox } from "@/features/requests/components/ManagerInbox/ManagerInbox";
import { ManagerLoading } from "@/features/family/components/ManagerLoading/ManagerLoading";
import { requestsCopy } from "@/features/requests/copy";
import { listFamilyRequests } from "@/features/requests/server/service";
import { parseRequestSearchParams, requestPageData } from "@/features/requests/server/page-data";
import styles from "@/features/requests/components/RequestUi/RequestUi.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export const metadata = { title: requestsCopy.inbox };

async function InboxContent({ searchParams }: Props) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const input = parseRequestSearchParams(await searchParams);
	const result = await requestPageData(() => listFamilyRequests(actor, input));
	return <ManagerInbox result={result} status={input.status} />;
}

export default function InboxPage(props: Props) {
	return (
		<div className={styles.page}>
			<PageHeader title={requestsCopy.inbox} description={requestsCopy.inboxIntro} />
			<Suspense fallback={<ManagerLoading />}>
				<InboxContent {...props} />
			</Suspense>
		</div>
	);
}
