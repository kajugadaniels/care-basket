import { Suspense } from "react";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { ReconnectDevice } from "@/features/devices/components/ReconnectDevice/ReconnectDevice";
import { BasketReview } from "@/features/requests/components/BasketReview/BasketReview";
import { ShopSkeleton } from "@/features/devices/components/ShopSkeleton/ShopSkeleton";
import { requestsCopy } from "@/features/requests/copy";

export const metadata = { title: requestsCopy.basketTitle };
async function BasketContent() {
	try { await requireDevice(); }
	catch (error) {
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") return <ReconnectDevice />;
		throw error;
	}
	return <BasketReview />;
}
export default function BasketPage() {
	return <Suspense fallback={<ShopSkeleton variant="basket" />}><BasketContent /></Suspense>;
}
