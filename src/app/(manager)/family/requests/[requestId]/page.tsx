import { Suspense } from "react";
import { requireAdult } from "@/server/auth/require-adult";
import { RequestDetail } from "@/features/requests/components/RequestUi/RequestDetail";
import { RequestSkeleton } from "@/features/requests/components/RequestUi/RequestSkeleton";
import { requestsCopy } from "@/features/requests/copy";
import { getFamilyRequest } from "@/features/requests/server/service";
import { requestPageData } from "@/features/requests/server/page-data";

type Props = { params: Promise<{ requestId: string }> };
export const metadata = { title: requestsCopy.managerDetailTitle };
async function DetailContent({ params }: Props) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const { requestId } = await params;
	return <RequestDetail request={await requestPageData(() => getFamilyRequest(actor, requestId))} />;
}
export default function DetailPage(props: Props) {
	return <Suspense fallback={<RequestSkeleton manager />}><DetailContent {...props} /></Suspense>;
}
