import { Suspense } from "react";
import type { Metadata } from "next";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { ReconnectDevice } from "@/features/devices/components/ReconnectDevice/ReconnectDevice";
import { ShopSkeleton } from "@/features/devices/components/ShopSkeleton/ShopSkeleton";
import { getShopHome } from "@/features/devices/server/service";
import { AssistantStart } from "@/features/assistant/components/AssistantStart/AssistantStart";
import { assistantAvailability } from "@/features/assistant/server/service";
import { assistantCopy } from "@/features/assistant/copy";

export const metadata: Metadata = { title: assistantCopy.title, robots: { index: false } };

async function AssistantContent() {
	let data;

	try {
		const actor = await requireDevice();
		const [profile, availability] = await Promise.all([
			getShopHome(actor),
			assistantAvailability(actor),
		]);
		data = { displayName: profile.displayName, ...availability };
	} catch (error) {
		if (!(error instanceof AppError && error.code === "UNAUTHENTICATED")) throw error;
	}

	return data ? <AssistantStart {...data} /> : <ReconnectDevice />;
}

export default function AssistantPage() {
	return (
		<Suspense fallback={<ShopSkeleton variant="assistant" />}>
			<AssistantContent />
		</Suspense>
	);
}
