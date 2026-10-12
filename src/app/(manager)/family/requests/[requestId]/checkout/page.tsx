import { Suspense } from "react";
import { CheckoutScreen } from "@/features/checkout/components/CheckoutScreen/CheckoutScreen";
import { checkoutCopy } from "@/features/checkout/copy";
import { getCheckout } from "@/features/checkout/server/service";
import { ManagerLoading } from "@/features/family/components/ManagerLoading/ManagerLoading";
import { requestPageData } from "@/features/requests/server/page-data";
import { getFamilyRequest } from "@/features/requests/server/service";
import { requireAdult } from "@/server/auth/require-adult";

type Props = { params: Promise<{ requestId: string }> };

export const metadata = { title: checkoutCopy.title };

async function CheckoutContent({ params }: Props) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const { requestId } = await params;
	const [request, checkout] = await requestPageData(() => Promise.all([
		getFamilyRequest(actor, requestId),
		getCheckout(actor, requestId),
	]));

	return <CheckoutScreen request={request} checkout={checkout} />;
}

export default function CheckoutPage(props: Props) {
	return <Suspense fallback={<ManagerLoading />}><CheckoutContent {...props} /></Suspense>;
}
