"use client";

import { RequestError } from "@/features/requests/components/RequestUi/RequestError";
import { devicesCopy } from "@/features/devices/copy";

export default function AssistantError({ retry }: { retry(): void }) {
	return <RequestError retry={retry} requester title={devicesCopy.errorTitle} />;
}
