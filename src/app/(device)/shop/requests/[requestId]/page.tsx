import { Suspense } from "react";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { ShopHome } from "@/features/devices/components/ShopHome/ShopHome";
import { RequestDetail } from "@/features/requests/components/RequestUi/RequestDetail";
import { RequestSkeleton } from "@/features/requests/components/RequestUi/RequestSkeleton";
import { getOwnRequest } from "@/features/requests/server/service";
import { requestPageData } from "@/features/requests/server/page-data";
import { requestsCopy } from "@/features/requests/copy";

type Props = { params: Promise<{ requestId: string }> };
export const metadata = { title: requestsCopy.listTitle };
async function DetailContent({ params }: Props) {
	let actor;
	try { actor = await requireDevice(); }
	catch (error) {
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") return <ShopHome profile={null} />;
		throw error;
	}
	const { requestId } = await params;
	const request = await requestPageData(() => getOwnRequest(actor, requestId));
	return <RequestDetail request={request} />;
}
export default function DetailPage(props: Props) {
	return <RequesterFrame wide><Suspense fallback={<RequestSkeleton />}><DetailContent {...props} /></Suspense></RequesterFrame>;
}
