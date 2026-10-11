"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/types/action-result";

type Page<T, Cursor> = { items: T[]; nextCursor: Cursor | null };

export function usePagedList<T extends { sku: string }, Cursor extends string | number>(
	initial: Page<T, Cursor>,
	fetchPage: (cursor: Cursor) => Promise<ActionResult<Page<T, Cursor>>>,
) {
	const [page, setPage] = useState(initial);
	const [failed, setFailed] = useState(false);
	const [pending, startTransition] = useTransition();
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
		startTransition(async () => {
			try {
				const result = await fetchPage(cursor);
				if (!mounted.current) return;
				if (!result.ok) { setFailed(true); return; }
				visited.current.add(cursor);
				const nextCursor = result.data.nextCursor;
				const exhausted = nextCursor !== null && visited.current.has(nextCursor);
				startTransition(() => setPage((previous) => {
					const skus = new Set(previous.items.map((item) => item.sku));
					const additions = result.data.items.filter((item) => {
						if (skus.has(item.sku)) return false;
						skus.add(item.sku);
						return true;
					});
					return { items: [...previous.items, ...additions], nextCursor: exhausted ? null : nextCursor };
				}));
			} catch {
				if (mounted.current) setFailed(true);
			} finally {
				inFlight.current = false;
			}
		});
	}

	return { items: page.items, hasMore: page.nextCursor !== null, failed, pending, loadMore };
}
