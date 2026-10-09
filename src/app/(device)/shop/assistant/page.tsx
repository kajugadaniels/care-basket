import { Suspense } from "react";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { ShopHome } from "@/features/devices/components/ShopHome/ShopHome";
import { RequestSkeleton } from "@/features/requests/components/RequestUi/RequestSkeleton";
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
	return <RequesterFrame wide><Suspense fallback={<RequestSkeleton />}><AssistantContent /></Suspense></RequesterFrame>;
}
