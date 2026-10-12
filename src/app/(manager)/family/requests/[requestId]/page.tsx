import { Suspense } from "react";
import { requireAdult } from "@/server/auth/require-adult";
import { RequestDetail } from "@/features/requests/components/RequestUi/RequestDetail";
import { ManagerLoading } from "@/features/family/components/ManagerLoading/ManagerLoading";
import { requestsCopy } from "@/features/requests/copy";
import { getFamilyRequest } from "@/features/requests/server/service";
import { requestPageData } from "@/features/requests/server/page-data";
import { getCheckout } from "@/features/checkout/server/service";

type Props = { params: Promise<{ requestId: string }> };
export const metadata = { title: requestsCopy.managerDetailTitle };
async function DetailContent({ params }: Props) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const { requestId } = await params;
	const [request, checkout] = await requestPageData(() => Promise.all([
		getFamilyRequest(actor, requestId), getCheckout(actor, requestId),
	]));
	return <RequestDetail request={request} checkout={checkout} />;
}
export default function DetailPage(props: Props) {
	return <Suspense fallback={<ManagerLoading />}><DetailContent {...props} /></Suspense>;
}
