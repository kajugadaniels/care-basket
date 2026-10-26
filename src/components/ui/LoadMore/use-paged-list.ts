"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import type { ActionResult } from "@/types/action-result";

type Page<T, Cursor> = { items: T[]; nextCursor: Cursor | null };

export function usePagedList<T extends { sku: string }, Cursor extends string | number>(
	initial: Page<T, Cursor>,
	fetchPage: (cursor: Cursor) => Promise<ActionResult<Page<T, Cursor>>>,
	errorMessage = "We couldn't load more items. Try again.",
) {
	const toast = useToast();
	const [page, setPage] = useState(initial);
	const [failed, setFailed] = useState(false);
	const [pending, setPending] = useState(false);
	const inFlight = useRef(false);
	const mounted = useRef(true);
	const visited = useRef(new Set<Cursor>());

	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);

	function loadMore() {
		if (inFlight.current || pending || page.nextCursor === null) return;
		const cursor = page.nextCursor;
		inFlight.current = true; // Observer and button can fire before the pending render.
		setFailed(false);
		setPending(true);
		void (async () => {
			let requestFailed = false;

			try {
				const result = await fetchPage(cursor);
				if (!mounted.current) return;
				if (!result.ok) {
					requestFailed = true;
					return;
				}
				visited.current.add(cursor);
				const nextCursor = result.data.nextCursor;
				const exhausted = nextCursor !== null && visited.current.has(nextCursor);
				setPage((previous) => {
					const skus = new Set(previous.items.map((item) => item.sku));
					const additions = result.data.items.filter((item) => {
						if (skus.has(item.sku)) return false;
						skus.add(item.sku);
						return true;
					});
					return { items: [...previous.items, ...additions], nextCursor: exhausted ? null : nextCursor };
				});
			} catch {
				requestFailed = true;
			} finally {
				inFlight.current = false;
				if (mounted.current) {
					setPending(false);
					setFailed(requestFailed);
					if (requestFailed) toast.notify({ kind: "error", message: errorMessage });
				}
			}
		})();
	}

	return { items: page.items, hasMore: page.nextCursor !== null, failed, pending, loadMore };
}
