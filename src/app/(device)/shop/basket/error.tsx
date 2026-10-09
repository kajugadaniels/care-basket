"use client";

import { RequesterFrame } from "@/features/devices/components/RequesterFrame/RequesterFrame";
import { RequestError } from "@/features/requests/components/RequestUi/RequestError";

export default function BasketError({ retry }: { retry: () => void }) {
	return <RequesterFrame wide><RequestError retry={retry} /></RequesterFrame>;
}
