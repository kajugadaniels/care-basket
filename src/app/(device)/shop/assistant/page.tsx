import { Suspense } from "react";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { ShopHome } from "@/features/devices/components/ShopHome/ShopHome";
import { ShopSkeleton } from "@/features/devices/components/ShopSkeleton/ShopSkeleton";
import { AssistantStart } from "@/features/assistant/components/AssistantStart/AssistantStart";
import { assistantAvailability } from "@/features/assistant/server/service";
import { assistantCopy } from "@/features/assistant/copy";

export const metadata = { title: assistantCopy.title };
async function AssistantContent() {
	let availability;
	try { availability = await assistantAvailability(await requireDevice()); }
	catch (error) { if (!(error instanceof AppError && error.code === "UNAUTHENTICATED")) throw error; }
	return availability ? <AssistantStart {...availability} /> : <ShopHome profile={null} />;
}
export default function AssistantPage() {
	return <Suspense fallback={<ShopSkeleton variant="assistant" />}><AssistantContent /></Suspense>;
}
