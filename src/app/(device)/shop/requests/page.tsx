import { Suspense } from "react";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { ShopHome } from "@/features/devices/components/ShopHome/ShopHome";
import { RequestList } from "@/features/requests/components/RequestUi/RequestList";
import { RequestSkeleton } from "@/features/requests/components/RequestUi/RequestSkeleton";
import { requestsCopy } from "@/features/requests/copy";
import { listOwnRequests } from "@/features/requests/server/service";
import { parseRequestSearchParams } from "@/features/requests/server/page-data";
import styles from "@/features/requests/components/RequestUi/RequestUi.module.css";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export const metadata = { title: requestsCopy.listTitle };
async function HistoryContent({ searchParams }: Props) {
	let actor;
	try { actor = await requireDevice(); }
	catch (error) {
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") return <ShopHome profile={null} />;
		throw error;
	}
	const result = await listOwnRequests(actor, parseRequestSearchParams(await searchParams));
	return <div className={`${styles.page} ${styles.requester}`}><h1>{requestsCopy.listTitle}</h1>
		<ActionLink href="/shop" variant="secondary" size="lg">{requestsCopy.home}</ActionLink>
		<RequestList result={result} />
	</div>;
}
export default function HistoryPage(props: Props) {
	return <RequesterFrame wide><Suspense fallback={<RequestSkeleton />}><HistoryContent {...props} /></Suspense></RequesterFrame>;
}
