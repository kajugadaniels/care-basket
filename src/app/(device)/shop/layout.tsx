import { Suspense, type ReactNode } from "react";
import type { DeviceActor } from "@/server/auth/device-policy";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { DraftProvider } from "@/features/requests/components/DraftProvider/DraftProvider";
import { ShopShell } from "@/features/devices/components/ShopShell/ShopShell";
import { ShopLoading } from "@/features/devices/components/ShopLoading/ShopLoading";
import { AssistantProvider } from "@/features/assistant/components/AssistantProvider/AssistantProvider";

async function DraftSession({ children }: { children: ReactNode }) {
	let actor: DeviceActor;

	try {
		actor = await requireDevice();
	} catch (error) {
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
			return <DraftProvider key="unconnected"><ShopShell>{children}</ShopShell></DraftProvider>;
		}
		throw error;
	}

	return (
		<DraftProvider key={`${actor.deviceId}:${actor.profileId}`}>
			<AssistantProvider>
				<ShopShell>{children}</ShopShell>
			</AssistantProvider>
		</DraftProvider>
	);
}

export default function ShopLayout({ children }: { children: ReactNode }) {
	return (
		<Suspense fallback={<DraftProvider><ShopShell><ShopLoading /></ShopShell></DraftProvider>}>
			<DraftSession>{children}</DraftSession>
		</Suspense>
	);
}
