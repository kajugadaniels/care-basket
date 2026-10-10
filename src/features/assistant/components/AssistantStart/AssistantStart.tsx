"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { CheckmarkCircle02Icon, KeyboardIcon, Mic01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { interpretTextAction } from "../../actions";
import { assistantCopy as copy } from "../../copy";
import type { Proposal } from "../../types";
import { useAssistant } from "../AssistantProvider/AssistantProvider";
import { WorkingNotice } from "../WorkingNotice/WorkingNotice";
import styles from "./AssistantStart.module.css";

const VoiceRecorder = dynamic(
	() => import("../VoiceRecorder/VoiceRecorder").then((module) => module.VoiceRecorder),
	{ loading: () => <p role="status">{copy.voiceLoading}</p> },
);

type Props = { displayName?: string; voice: boolean; child: boolean };

export function AssistantStart({ displayName, voice, child }: Props) {
	const router = useRouter();
	const { text, setText, setProposal } = useAssistant();
	const [mode, setMode] = useState<"text" | "voice">("text");
	const [error, setError] = useState("");
	const [pending, startTransition] = useTransition();
	const statusRef = useRef<HTMLParagraphElement>(null);
	const noticeId = useId();
	const hintId = useId();
	// The server remains authoritative; a child must never mount recording UI.
	const canSpeak = voice && !child;

	useEffect(() => { if (error) statusRef.current?.focus(); }, [error]);
	function review(proposal: Proposal) {
		setText(proposal.inputText);
		setProposal(proposal);
		router.push("/shop/assistant/review");
	}

	return (
		<div className={styles.page}>
			<header className={styles.heading}>
				<h1>
					{displayName ? copy.greeting({ name: displayName }) : copy.welcome}
				</h1>
				<p className={styles.notice}>{copy.welcomeHelp}</p>
			</header>
			<section className={styles.panel} aria-label={copy.title}>
				<div className={styles.choices}>
					<Button size="lg" variant="secondary" disabled={pending} aria-pressed={mode === "text"}
						icon={mode === "text" ? CheckmarkCircle02Icon : KeyboardIcon} onClick={() => setMode("text")}>
						{copy.type}
					</Button>
					<Button size="lg" variant="secondary" disabled={!canSpeak || pending}
						aria-pressed={mode === "voice" && canSpeak} aria-describedby={noticeId}
						icon={mode === "voice" && canSpeak ? CheckmarkCircle02Icon : Mic01Icon}
						onClick={() => { if (canSpeak) setMode("voice"); }}>
						{copy.speak}
					</Button>
				</div>
				<p id={noticeId} className={styles.notice}>{canSpeak ? copy.disclosure : copy.voiceUnavailable}</p>
				{mode === "text" || !canSpeak ? (
					<form className={styles.composer} onSubmit={(event) => {
						event.preventDefault();
						if (pending) return;
						setError("");
						startTransition(async () => {
							try {
								const result = await interpretTextAction({ text });
								if (result.ok) review(result.data);
								else setError(result.error.message);
							} catch { setError(copy.error); }
						});
					}}>
						<label className={styles.field}>{copy.prompt}
							<textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={500} required
								aria-describedby={hintId} placeholder={copy.placeholder} disabled={pending} />
						</label>
						<p id={hintId} className={styles.notice}>{copy.typingHelp}</p>
						<Button className={styles.submit} size="lg" type="submit" loading={pending}>
							{pending ? copy.working : copy.continue}
						</Button>
					</form>
				) : null}
			</section>
			{mode === "voice" && canSpeak ? <VoiceRecorder onProposal={review} onType={() => setMode("text")} /> : null}
			{pending ? <WorkingNotice /> : null}
			<div className={styles.nextSteps}>
				<p className={styles.notice}>{copy.reviewHelp}</p>
				<ActionLink href="/shop/requests" variant="secondary">{copy.sentLists}</ActionLink>
			</div>
			{error ? <p ref={statusRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
		</div>
	);
}

