"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useToastSound() {
	const [enabled, setEnabled] = useState(true);
	const muted = useRef(false);
	const context = useRef<AudioContext | null>(null);

	useEffect(() => () => {
		const audio = context.current;
		context.current = null;
		if (audio && audio.state !== "closed") void audio.close().catch(() => {});
	}, []);

	// Called only by a click/submit gesture, never by mounting a toast.
	const prepare = useCallback(() => {
		if (muted.current || document.visibilityState === "hidden" || !window.AudioContext) return;
		try {
			context.current ??= new window.AudioContext();
			if (context.current.state === "suspended") void context.current.resume().catch(() => {});
		} catch { /* Audio is optional; saving and visual feedback still work. */ }
	}, []);

	const play = useCallback((kind: "success" | "warning" | "error") => {
		const audio = context.current;
		if (muted.current || document.visibilityState === "hidden" || audio?.state !== "running") return;
		try {
			const notes = kind === "success" ? [660, 880] : kind === "warning" ? [520, 440] : [440, 330];
			notes.forEach((frequency, index) => {
				const start = audio.currentTime + index * 0.12;
				const oscillator = audio.createOscillator();
				const gain = audio.createGain();
				oscillator.type = "sine";
				oscillator.frequency.setValueAtTime(frequency, start);
				gain.gain.setValueAtTime(0, start);
				gain.gain.linearRampToValueAtTime(0.035, start + 0.015);
				gain.gain.linearRampToValueAtTime(0, start + 0.15);
				oscillator.connect(gain);
				gain.connect(audio.destination);
				oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
				oscillator.start(start);
				oscillator.stop(start + 0.16);
			});
		} catch { /* Unsupported audio must not become a mutation failure. */ }
	}, []);

	const toggle = useCallback(() => {
		setEnabled((currentEnabled) => {
			muted.current = currentEnabled;
			if (!currentEnabled) prepare();
			return !currentEnabled;
		});
	}, [prepare]);

	return useMemo(() => ({ enabled, prepare, play, toggle }), [enabled, play, prepare, toggle]);
}
