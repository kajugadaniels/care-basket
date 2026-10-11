import { Suspense } from "react";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { ReconnectDevice } from "@/features/devices/components/ReconnectDevice/ReconnectDevice";
import { RequestDetail } from "@/features/requests/components/RequestUi/RequestDetail";
import { ShopLoading } from "@/features/devices/components/ShopLoading/ShopLoading";
import { getOwnRequest } from "@/features/requests/server/service";
import { requestPageData } from "@/features/requests/server/page-data";
import { requestsCopy } from "@/features/requests/copy";

type Props = { params: Promise<{ requestId: string }> };
export const metadata = { title: requestsCopy.detailTitle };
async function DetailContent({ params }: Props) {
	let actor;
	try { actor = await requireDevice(); }
	catch (error) {
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") return <ReconnectDevice />;
		throw error;
	}
	const { requestId } = await params;
	const request = await requestPageData(() => getOwnRequest(actor, requestId));
	return <RequestDetail request={request} />;
}
export default function DetailPage(props: Props) {
	return <Suspense fallback={<ShopLoading />}><DetailContent {...props} /></Suspense>;
}
