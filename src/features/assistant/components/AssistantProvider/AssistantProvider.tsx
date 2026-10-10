"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Proposal } from "../../types";

type AssistantContextValue = {
	text: string;
	proposal: Proposal | null;
	revision: number;
	setText(text: string): void;
	setProposal(proposal: Proposal | null): void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

// The device-keyed shop layout owns this state. No transcript, proof, or draft
// is placed in a URL or persistent browser storage when moving to review.
export function AssistantProvider({ children }: { children: ReactNode }) {
	const [text, setText] = useState("");
	const [review, setReview] = useState<{ proposal: Proposal | null; revision: number }>({ proposal: null, revision: 0 });

	function setProposal(proposal: Proposal | null) {
		// A fresh interpretation resets review controls even if the words are identical.
		setReview((previous) => ({ proposal, revision: previous.revision + 1 }));
	}

	return (
		<AssistantContext.Provider value={{ text, ...review, setText, setProposal }}>
			{children}
		</AssistantContext.Provider>
	);
}

export function useAssistant() {
	const value = useContext(AssistantContext);
	if (!value) throw new Error("Assistant state requires the authenticated shop layout.");
	return value;
}
