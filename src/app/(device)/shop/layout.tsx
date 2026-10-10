import { Suspense, type ReactNode } from "react";
import type { DeviceActor } from "@/server/auth/device-policy";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { DraftProvider } from "@/features/requests/components/DraftProvider/DraftProvider";
import { ShopShell } from "@/features/devices/components/ShopShell/ShopShell";
import { ShopSkeleton } from "@/features/devices/components/ShopSkeleton/ShopSkeleton";
import { AssistantProvider } from "@/features/assistant/components/AssistantProvider/AssistantProvider";

async function DraftSession({ children }: { children: ReactNode }) {
	let actor: DeviceActor;

	try {
		actor = await requireDevice();
	} catch (error) {
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") return children;
		throw error;
	}

	return (
		<DraftProvider key={`${actor.deviceId}:${actor.profileId}`}>
			<AssistantProvider>{children}</AssistantProvider>
		</DraftProvider>
	);
}

export default function ShopLayout({ children }: { children: ReactNode }) {
	return (
		<ShopShell>
			<Suspense fallback={<ShopSkeleton />}>
				<DraftSession>{children}</DraftSession>
			</Suspense>
		</ShopShell>
	);
}
