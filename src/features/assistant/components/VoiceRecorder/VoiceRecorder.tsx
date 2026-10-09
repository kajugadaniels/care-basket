"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { AUDIO_LIMIT } from "@/lib/audio";
import { assistantCopy as copy } from "../../copy";
import type { Proposal } from "../../types";
import { WorkingNotice } from "../WorkingNotice/WorkingNotice";
import styles from "./VoiceRecorder.module.css";

export function VoiceRecorder({ onProposal, onType }: { onProposal(proposal: Proposal): void; onType(): void }) {
	const [state, setState] = useState<"idle" | "recording" | "pending">("idle");
	const [seconds, setSeconds] = useState(0);
	const [error, setError] = useState("");
	const active = useRef(true);
	const acquiring = useRef(false);
	const recorder = useRef<MediaRecorder | null>(null);
	const stream = useRef<MediaStream | null>(null);
	const timer = useRef<ReturnType<typeof setInterval> | null>(null);
	const upload = useRef<AbortController | null>(null);
	const errorRef = useRef<HTMLParagraphElement>(null);
	useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
			if (timer.current) clearInterval(timer.current);
			if (recorder.current?.state === "recording") recorder.current.stop();
			stream.current?.getTracks().forEach((track) => track.stop());
			upload.current?.abort();
		};
	}, []);
	async function start() {
		if (acquiring.current || recorder.current?.state === "recording" || upload.current) return;
		setError("");
		if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
			setError(copy.recordingUnavailable); return;
		}
		const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
		if (!mime) { setError(copy.recordingUnavailable); return; }
		acquiring.current = true;
		try {
			const tracks = await navigator.mediaDevices.getUserMedia({ audio: true });
			if (!active.current) { tracks.getTracks().forEach((track) => track.stop()); return; }
			stream.current = tracks;
			const capture = new MediaRecorder(tracks, { mimeType: mime });
			recorder.current = capture;
			let chunks: Blob[] = [];
			let size = 0;
			let failed = false;
			capture.ondataavailable = (event) => {
				size += event.data.size;
				if (size <= AUDIO_LIMIT) chunks.push(event.data);
				else if (capture.state === "recording") capture.stop();
			};
			capture.onstop = async () => {
				if (timer.current) clearInterval(timer.current);
				tracks.getTracks().forEach((track) => track.stop());
				if (!active.current) { chunks = []; return; }
				if (failed || !size || size > AUDIO_LIMIT) { chunks = []; setState("idle"); setError(copy.voiceError); return; }
				setState("pending");
				const form = new FormData();
				form.append("audio", new Blob(chunks, { type: mime }), "shopping-audio");
				chunks = [];
				const controller = new AbortController();
				upload.current = controller;
				const timeout = setTimeout(() => controller.abort(), 30_000);
				try {
					const response = await fetch("/api/assistant/voice", { method: "POST", body: form, signal: controller.signal });
					const result = await response.json() as { data?: Proposal };
					if (!response.ok || !result.data) throw new Error();
					if (active.current) onProposal(result.data);
				} catch { if (active.current) setError(copy.voiceError); }
				finally { clearTimeout(timeout); upload.current = null; if (active.current) setState("idle"); }
			};
			capture.onerror = () => {
				failed = true;
				tracks.getTracks().forEach((track) => track.stop());
				if (capture.state === "recording") capture.stop();
				else {
					if (timer.current) clearInterval(timer.current);
					chunks = [];
					setState("idle");
				}
				if (active.current) setError(copy.voiceError);
			};
			capture.start(1000);
			setSeconds(0);
			setState("recording");
			const started = Date.now();
			timer.current = setInterval(() => {
				const elapsed = Math.floor((Date.now() - started) / 1000);
				setSeconds(Math.min(60, elapsed));
				if (elapsed >= 60 && capture.state === "recording") capture.stop();
			}, 250);
		} catch (error) {
			stream.current?.getTracks().forEach((track) => track.stop());
			const denied = typeof error === "object" && error !== null && "name" in error && error.name === "NotAllowedError";
			if (active.current) setError(denied ? copy.permissionError : copy.voiceError);
		}
		finally { acquiring.current = false; }
	}
	return <section className={styles.panel}>
		{state === "pending" ? <WorkingNotice /> : <p role="status">{state === "recording" ? copy.listening : copy.speak}</p>}
		{state === "recording" ? <><p><time>{seconds}s</time> / 60s</p>
			{seconds >= 50 ? <p role="status">{copy.warning}</p> : null}
			<Button size="lg" onClick={() => recorder.current?.stop()}>{copy.stop}</Button></>
			: <Button size="lg" loading={state === "pending"} onClick={() => void start()}>{copy.start}</Button>}
		{error ? <p ref={errorRef} tabIndex={-1} role="alert">{error}</p> : null}
		<Button variant="secondary" size="lg" disabled={state !== "idle"} onClick={onType}>{copy.type}</Button>
	</section>;
}
