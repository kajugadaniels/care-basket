"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import type { SubmitRequestInput } from "../../schemas";
import { changeDraft, createDraftKey, EMPTY_DRAFT, type Draft, type DraftChange } from "../../draft";
import { requestsCopy } from "../../copy";

type DraftContextValue = {
	draft: Draft; locked: boolean;
	change: (change: DraftChange) => boolean;
	begin: () => SubmitRequestInput | null;
	finish: (key: string, succeeded: boolean) => void;
};
const DraftContext = createContext<DraftContextValue | null>(null);

// Scoped to the authenticated shop layout; no persistent storage, tokens, or prices.
export function DraftProvider({ children }: { children: ReactNode }) {
	const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
	const [locked, setLocked] = useState(false);
	const current = useRef({ draft: EMPTY_DRAFT, locked: false });
	const toast = useToast();

	function change(change: DraftChange): boolean {
		if (current.current.locked) return false;
		const previousCount = current.current.draft.items.length;
		const removed = change.type === "remove"
			? current.current.draft.items.find((item) => item.sku === change.sku)
			: null;
		if (["add", "proposal", "remove", "clear"].includes(change.type)) toast.prepareSound();
		try {
			const next = changeDraft(current.current.draft, change, createDraftKey());
			current.current.draft = next;
			setDraft(next);
			const added = change.type === "add" ? change.item.displayName
				: change.type === "proposal" && next.items.length > previousCount ? change.items[0]?.displayName : null;
			const feedback = added ? requestsCopy.added(added)
				: removed ? requestsCopy.draftRemoved({ name: removed.displayName })
					: change.type === "clear" && previousCount ? requestsCopy.cleared : "";
			if (feedback) toast.notify({ kind: "success", message: feedback });
			return true;
		} catch {
			toast.notify({ kind: "error", message: requestsCopy.limit });
			return false;
		}
	}
	function begin(): SubmitRequestInput | null {
		const state = current.current;
		const { items, clientRequestKey, ...metadata } = state.draft;
		if (state.locked || !items.length || !clientRequestKey) return null;
		state.locked = true;
		setLocked(true);
		return { ...metadata, clientRequestKey, inputMode: state.draft.inputMode ?? "PICTURES",
			items: items.map(({ sku, quantity, origin, isSubstitute, substitutionNote, proof }) => ({ sku, quantity,
				...(origin ? { origin } : {}), ...(isSubstitute ? { isSubstitute, substitutionNote } : {}), ...(proof ? { proof } : {}) })) };
	}
	function finish(key: string, succeeded: boolean) {
		if (current.current.draft.clientRequestKey !== key) return;
		current.current.locked = false;
		setLocked(false);
		if (succeeded) {
			current.current.draft = EMPTY_DRAFT;
			setDraft(EMPTY_DRAFT);
		}
	}
	return <DraftContext.Provider value={{ draft, locked, change, begin, finish }}>{children}</DraftContext.Provider>;
}

export function useDraft() {
	const value = useContext(DraftContext);
	if (!value) throw new Error("Shopping draft requires the shop layout.");
	return value;
}
