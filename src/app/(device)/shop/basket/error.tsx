"use client";

import { RequestError } from "@/features/requests/components/RequestUi/RequestError";

export default function BasketError({ retry }: { retry: () => void }) {
	return <RequestError retry={retry} requester />;
}
