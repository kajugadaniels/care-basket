"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { interpretTextAction } from "../../actions";
import { assistantCopy as copy } from "../../copy";
import type { Proposal } from "../../types";
import { ProposalReview } from "../ProposalReview/ProposalReview";
import { VoiceRecorder } from "../VoiceRecorder/VoiceRecorder";
import { WorkingNotice } from "../WorkingNotice/WorkingNotice";
import styles from "./AssistantStart.module.css";

export function AssistantStart({ voice, child }: { voice: boolean; child: boolean }) {
	const [mode, setMode] = useState<"text" | "voice" | null>(null);
	const [text, setText] = useState("");
	const [proposal, setProposal] = useState<Proposal | null>(null);
	const [error, setError] = useState("");
	const [pending, startTransition] = useTransition();
	const statusRef = useRef<HTMLParagraphElement>(null);
	const headingRef = useRef<HTMLHeadingElement>(null);
	useEffect(() => { if (error) statusRef.current?.focus(); }, [error]);
	useEffect(() => { if (proposal) headingRef.current?.focus(); }, [proposal]);
	return <div className={styles.page}>
		<h1 ref={headingRef} tabIndex={-1}>{proposal ? copy.review : copy.title}</h1>
		{proposal ? <ProposalReview key={proposal.sourceProof} proposal={proposal} child={child}
			onBack={() => setProposal(null)} /> : <>
			<p className={styles.notice}>{voice ? copy.disclosure : copy.local}</p>
			<div className={styles.choices}>
				<Button size="lg" variant="secondary" disabled={!voice || pending} onClick={() => setMode("voice")}>{copy.speak}</Button>
				<Button size="lg" variant="secondary" disabled={pending} onClick={() => setMode("text")}>{copy.type}</Button>
				<ActionLink href="/shop/products" size="lg" variant="secondary">{copy.pictures}</ActionLink>
			</div>
			{mode === "text" ? <form className={styles.panel} onSubmit={(event) => {
				event.preventDefault();
				setError("");
				startTransition(async () => {
					try {
						const result = await interpretTextAction({ text });
						if (result.ok) setProposal(result.data);
						else setError(result.error.message);
					} catch { setError(copy.error); }
				});
			}}>
				<label className={styles.field}>{copy.prompt}
					<textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={500} required
						placeholder={copy.placeholder} disabled={pending} />
				</label>
				<div className={styles.actions}><Button size="lg" type="submit" loading={pending}>{copy.continue}</Button>
					<Button size="lg" variant="secondary" disabled={pending} onClick={() => setMode(null)}>{copy.cancel}</Button></div>
			</form> : null}
			{mode === "voice" && voice ? <VoiceRecorder onProposal={setProposal} onType={() => setMode("text")} /> : null}
			{pending ? <WorkingNotice /> : null}
		</>}
		{error ? <p ref={statusRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
	</div>;
}

