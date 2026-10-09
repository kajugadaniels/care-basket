"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import type { SubmitRequestInput } from "../../schemas";
import { changeDraft, createDraftKey, EMPTY_DRAFT, type Draft, type DraftChange } from "../../draft";
import { requestsCopy } from "../../copy";

type DraftContextValue = {
	draft: Draft; locked: boolean; message: string;
	change: (change: DraftChange) => void;
	begin: () => SubmitRequestInput | null;
	finish: (key: string, succeeded: boolean) => void;
};
const DraftContext = createContext<DraftContextValue | null>(null);

// Scoped to the authenticated shop layout; no persistent storage, tokens, or prices.
export function DraftProvider({ children }: { children: ReactNode }) {
	const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
	const [locked, setLocked] = useState(false);
	const [message, setMessage] = useState("");
	const current = useRef({ draft: EMPTY_DRAFT, locked: false });

	function change(change: DraftChange) {
		if (current.current.locked) return;
		try {
			const next = changeDraft(current.current.draft, change, createDraftKey());
			current.current.draft = next;
			setDraft(next);
			setMessage(change.type === "add" ? requestsCopy.added(change.item.displayName) : "");
		} catch { setMessage(requestsCopy.limit); }
	}
	function begin(): SubmitRequestInput | null {
		const state = current.current;
		if (state.locked || !state.draft.items.length || !state.draft.clientRequestKey) return null;
		state.locked = true;
		setLocked(true);
		return { clientRequestKey: state.draft.clientRequestKey, inputMode: "PICTURES",
			items: state.draft.items.map(({ sku, quantity }) => ({ sku, quantity })) };
	}
	function finish(key: string, succeeded: boolean) {
		if (current.current.draft.clientRequestKey !== key) return;
		current.current.locked = false;
		setLocked(false);
		if (succeeded) {
			current.current.draft = EMPTY_DRAFT;
			setDraft(EMPTY_DRAFT);
			setMessage("");
		}
	}
	return <DraftContext.Provider value={{ draft, locked, message, change, begin, finish }}>{children}</DraftContext.Provider>;
}

export function useDraft() {
	const value = useContext(DraftContext);
	if (!value) throw new Error("Shopping draft requires the shop layout.");
	return value;
}
