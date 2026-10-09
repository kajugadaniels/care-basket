import type { Metadata } from "next";
import { Suspense } from "react";
import { FamilyWelcome } from "@/features/family/components/FamilyWelcome/FamilyWelcome";
import { FamilyWelcomeSkeleton } from "@/features/family/components/FamilyWelcome/FamilyWelcomeSkeleton";
import { SetupPreview } from "@/features/family/components/SetupPreview/SetupPreview";
import { familyDashboardCopy } from "@/features/family/copy";
import { getFamilyOverview } from "@/features/family/server/service";
import { countManagedProfiles } from "@/features/profiles/server/service";
import { countWaitingRequests } from "@/features/requests/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import styles from "./page.module.css";

export const metadata: Metadata = {
	title: familyDashboardCopy.metaTitle,
};

// The planned-features preview is static, so it renders at once; the personal overview
// streams in behind a skeleton with the same layout.
export default function FamilyPage() {
	return (
		<div className={styles.page}>
			<Suspense fallback={<FamilyWelcomeSkeleton />}>
				<FamilyOverviewSection />
			</Suspense>
			<SetupPreview />
		</div>
	);
}

// requireAdult() sends signed-out visitors to sign-in and adults without a family to setup.
async function FamilyOverviewSection() {
	const actor = await requireAdult();
	const [family, profileCount, pendingRequestCount] = await Promise.all([
		getFamilyOverview(actor),
		countManagedProfiles(actor),
		countWaitingRequests(actor),
	]);

	return <FamilyWelcome family={family} profileCount={profileCount} pendingRequestCount={pendingRequestCount} />;
}
