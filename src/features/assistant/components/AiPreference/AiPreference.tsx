"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button/Button";
import { updateAiPreferenceAction } from "../../actions";
import { assistantCopy as copy } from "../../copy";
import styles from "./AiPreference.module.css";

export function AiPreference({ profileId, enabled, available }: { profileId: string; enabled: boolean; available: boolean }) {
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
			startTransition(async () => {
				try {
					const result = await updateAiPreferenceAction({ profileId, enabled: !enabled, consent });
					setError(!result.ok); setMessage(result.ok ? copy.saved : result.error.message);
				} catch { setError(true); setMessage(copy.error); }
			});
		}}>{enabled ? copy.revoke : copy.enable}</Button> : null}
		{message ? <p ref={resultRef} tabIndex={-1} role={error ? "alert" : "status"}>{message}</p> : null}
	</section>;
}
