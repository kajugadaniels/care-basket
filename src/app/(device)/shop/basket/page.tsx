import { Suspense } from "react";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { ShopHome } from "@/features/devices/components/ShopHome/ShopHome";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { BasketReview } from "@/features/requests/components/BasketReview/BasketReview";
import { RequestSkeleton } from "@/features/requests/components/RequestUi/RequestSkeleton";
import { requestsCopy } from "@/features/requests/copy";

export const metadata = { title: requestsCopy.basketTitle };
async function BasketContent() {
	try { await requireDevice(); }
	catch (error) {
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") return <ShopHome profile={null} />;
		throw error;
	}
	return <BasketReview />;
}
export default function BasketPage() {
	return <RequesterFrame wide><Suspense fallback={<RequestSkeleton />}><BasketContent /></Suspense></RequesterFrame>;
}
