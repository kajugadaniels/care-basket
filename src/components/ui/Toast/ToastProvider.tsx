"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Toast, type ToastKind, type ToastNotice } from "./Toast";
import { useToastSound } from "./use-toast-sound";

type NoticeInput = {
	kind: ToastKind;
	message: string;
	title?: string;
};

type ToastContextValue = {
	notify: (notice: NoticeInput) => void;
	dismiss: () => void;
	prepareSound: () => void;
};

const fallback: ToastContextValue = {
	notify: () => undefined,
	dismiss: () => undefined,
	prepareSound: () => undefined,
};

const ToastContext = createContext<ToastContextValue>(fallback);

const titles: Record<ToastKind, string> = {
	success: "Done",
	warning: "Check this",
	error: "Action not completed",
};

const dismissLabels: Record<ToastKind, string> = {
	success: "Dismiss success message",
	warning: "Dismiss warning",
	error: "Dismiss error notification",
};

export function ToastProvider({ children }: { children: ReactNode }) {
	const [notice, setNotice] = useState<ToastNotice | null>(null);
	const sequence = useRef(0);
	const sound = useToastSound();

	const dismiss = useCallback(() => setNotice(null), []);
	const notify = useCallback((input: NoticeInput) => {
		setNotice({ ...input, id: ++sequence.current, title: input.title ?? titles[input.kind] });
		sound.play(input.kind);
	}, [sound.play]);

	useEffect(() => {
		if (!notice || notice.kind === "error") return;
		const timeout = window.setTimeout(dismiss, notice.kind === "warning" ? 7_000 : 5_000);
		return () => window.clearTimeout(timeout);
	}, [dismiss, notice]);

	const value = useMemo<ToastContextValue>(() => ({ notify, dismiss, prepareSound: sound.prepare }), [dismiss, notify, sound.prepare]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<Toast notice={notice} dismissLabel={dismissLabels[notice?.kind ?? "success"]} onDismiss={dismiss} />
		</ToastContext.Provider>
	);
}

export function useToast() {
	return useContext(ToastContext);
}
