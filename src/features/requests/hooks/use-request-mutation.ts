"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { RequestMutationResult } from "../types";
import { requestsCopy } from "../copy";

export function useRequestMutation() {
	const [pending, startTransition] = useTransition();
	const [pendingKey, setPendingKey] = useState<string | null>(null);
	const [error, setError] = useState("");
	const inFlight = useRef(false);
	const errorRef = useRef<HTMLParagraphElement>(null);

	useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

	// Event-only check: the ref closes the gap before React renders pending state.
	function isRunning() {
		return inFlight.current || pending;
	}

	function run(action: () => Promise<RequestMutationResult>, onSuccess?: () => void, key?: string) {
		if (isRunning()) return;
		inFlight.current = true;
		setError("");
		setPendingKey(key ?? null);
		startTransition(async () => {
			try {
				const result = await action();
				if (!result.ok) { setError(result.error.message); return; }
				onSuccess?.();
				// These actions revalidate the current detail path and return fresh UI in
				// the same response. Another router.refresh would repeat that server read.
			} catch { setError(requestsCopy.errors.INTERNAL); }
			finally { inFlight.current = false; }
		});
	}

	return { pending, pendingKey: pending ? pendingKey : null, error, errorRef, run, isRunning };
}
