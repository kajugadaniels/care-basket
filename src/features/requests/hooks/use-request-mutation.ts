"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RequestMutationResult } from "../types";
import { requestsCopy } from "../copy";

export function useRequestMutation() {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);
	const inFlight = useRef(false);
	const errorRef = useRef<HTMLParagraphElement>(null);
	useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
	function run(action: () => Promise<RequestMutationResult>, onSuccess?: () => void) {
		if (inFlight.current) return;
		inFlight.current = true;
		setError("");
		setSaved(false);
		startTransition(async () => {
			try {
				const result = await action();
				if (!result.ok) { setError(result.error.message); return; }
				setSaved(true);
				onSuccess?.();
				router.refresh();
			} catch { setError(requestsCopy.errors.INTERNAL); }
			finally { inFlight.current = false; }
		});
	}
	return { pending, error, saved, errorRef, run };
}
