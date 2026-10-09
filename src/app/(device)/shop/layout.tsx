import { Suspense, type ReactNode } from "react";
import type { DeviceActor } from "@/server/auth/device-policy";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { DraftProvider } from "@/features/requests/components/DraftProvider/DraftProvider";
import { RequestSkeleton } from "@/features/requests/components/RequestUi/RequestSkeleton";
import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";

async function DraftSession({ children }: { children: ReactNode }) {
	let actor: DeviceActor;

	try {
		actor = await requireDevice();
	} catch (error) {
		if (error instanceof AppError && error.code === "UNAUTHENTICATED") return children;
		throw error;
	}

	return <DraftProvider key={`${actor.deviceId}:${actor.profileId}`}>{children}</DraftProvider>;
}

export default function ShopLayout({ children }: { children: ReactNode }) {
	return <Suspense fallback={<RequesterFrame wide><RequestSkeleton /></RequesterFrame>}>
		<DraftSession>{children}</DraftSession>
	</Suspense>;
}
