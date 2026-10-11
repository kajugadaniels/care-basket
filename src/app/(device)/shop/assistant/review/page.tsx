import { Suspense } from "react";
import type { Metadata } from "next";
import { ProposalReviewScreen } from "@/features/assistant/components/ProposalReview/ProposalReviewScreen";
import { ShopLoading } from "@/features/devices/components/ShopLoading/ShopLoading";
import { assistantCopy } from "@/features/assistant/copy";
import { ReconnectDevice } from "@/features/devices/components/ReconnectDevice/ReconnectDevice";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { restoreShoppingReview } from "@/features/assistant/server/saved-review";

export const metadata: Metadata = { title: assistantCopy.reviewPageTitle, robots: { index: false } };

type ReviewPageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

async function ReviewContent({ searchParams }: ReviewPageProps) {
	let actor;
	try {
		actor = await requireDevice();
	} catch (error) {
		if (!(error instanceof AppError && error.code === "UNAUTHENTICATED")) throw error;
	}

	if (!actor) return <ReconnectDevice />;
	const query = searchParams ? await searchParams : {};
	// Absence keeps in-memory navigation working; an invalid supplied ID never falls back to another review.
	const savedProposal = query.review === undefined ? undefined : await restoreShoppingReview(actor, query.review);
	return <ProposalReviewScreen savedProposal={savedProposal} />;
}

export default function ReviewPage({ searchParams }: ReviewPageProps = {}) {
	return (
		<Suspense fallback={<ShopLoading label={assistantCopy.reviewLoading} />}>
			<ReviewContent searchParams={searchParams} />
		</Suspense>
	);
}
