"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import { updateAiPreferenceAction } from "../../actions";
import { assistantCopy as copy } from "../../copy";
import styles from "./AiPreference.module.css";

export function AiPreference({ profileId, enabled, available }: { profileId: string; enabled: boolean; available: boolean }) {
	const toast = useToast();
	const [consent, setConsent] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState(false);
	const [pending, startTransition] = useTransition();
	const resultRef = useRef<HTMLParagraphElement>(null);
	useEffect(() => { if (message) resultRef.current?.focus(); }, [message]);
	return <section className={styles.panel}>
		<h2>{copy.consentTitle}</h2>
		{!available ? <p>{copy.blocked}</p> : null}
		{!enabled && available ? <label className={styles.check}><input type="checkbox" checked={consent}
			disabled={pending} onChange={(event) => setConsent(event.target.checked)} />{copy.consent}</label> : null}
		{enabled || available ? <Button disabled={!enabled && !consent} loading={pending} variant="secondary" onClick={() => {
			toast.prepareSound();
			startTransition(async () => {
				try {
					const result = await updateAiPreferenceAction({ profileId, enabled: !enabled, consent });
					const nextMessage = result.ok ? result.feedback.message : result.error.message;
					setError(!result.ok); setMessage(nextMessage);
					toast.notify(result.ok ? result.feedback : { kind: "error", message: result.error.message });
				} catch {
					setError(true); setMessage(copy.error); toast.notify({ kind: "error", message: copy.error });
				}
			});
		}}>{enabled ? copy.revoke : copy.enable}</Button> : null}
		{message ? <p ref={resultRef} tabIndex={-1} role={error ? "alert" : "status"}>{message}</p> : null}
	</section>;
}
