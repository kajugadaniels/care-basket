"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { TextField } from "@/components/ui/TextField/TextField";
import { reviewPairingAction } from "../../actions";
import { devicesCopy } from "../../copy";
import type { PairingReviewDto, ProfileOption } from "../../types";
import { ApprovalReview } from "../ApprovalReview/ApprovalReview";
import styles from "./ApprovalForm.module.css";

export function ApprovalForm({ profiles, preselected }: { profiles: ProfileOption[]; preselected?: string }) {
  const [code, setCode] = useState("");
  const [review, setReview] = useState<PairingReviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const inFlight = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  if (review) return <ApprovalReview review={review} profiles={profiles} preselected={preselected} />;
  return <form className={styles.form} noValidate aria-busy={isPending} onSubmit={async (event) => {
    event.preventDefault(); if (inFlight.current) return;
    inFlight.current = true; setIsPending(true); setError(null);
    try {
      const result = await reviewPairingAction({ code });
      if (result.ok) { setReview(result.data); setCode(""); }
      else { setError(result.error.message); requestAnimationFrame(() => errorRef.current?.focus()); }
    } catch { setError(devicesCopy.errors.INTERNAL); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { inFlight.current = false; setIsPending(false); }
  }}>
    <TextField className={styles.field} name="code" label={devicesCopy.codeInput} hint={devicesCopy.codeHint}
      value={code} onChange={(event) => setCode(event.target.value)} maxLength={7} inputMode="numeric" autoComplete="off"
      error={error ?? undefined} disabled={isPending} />
    {error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
    <Button type="submit" disabled={isPending} aria-busy={isPending}>{isPending ? devicesCopy.checking : devicesCopy.lookup}</Button>
    <p role="status">{isPending ? devicesCopy.checking : ""}</p>
  </form>;
}
