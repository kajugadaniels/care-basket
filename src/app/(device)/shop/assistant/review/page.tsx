import { Suspense } from "react";
import type { Metadata } from "next";
import { ProposalReviewScreen } from "@/features/assistant/components/ProposalReview/ProposalReviewScreen";
import { ProposalReviewSkeleton } from "@/features/assistant/components/ProposalReview/ProposalReviewSkeleton";
import { assistantCopy } from "@/features/assistant/copy";
import { ReconnectDevice } from "@/features/devices/components/ReconnectDevice/ReconnectDevice";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: assistantCopy.reviewPageTitle, robots: { index: false } };

async function ReviewContent() {
	let actor;
	try {
		actor = await requireDevice();
	} catch (error) {
		if (!(error instanceof AppError && error.code === "UNAUTHENTICATED")) throw error;
	}

	return actor ? <ProposalReviewScreen child={actor.profileKind === "CHILD"} /> : <ReconnectDevice />;
}

export default function ReviewPage() {
	return (
		<Suspense fallback={<ProposalReviewSkeleton />}>
			<ReviewContent />
		</Suspense>
	);
}
