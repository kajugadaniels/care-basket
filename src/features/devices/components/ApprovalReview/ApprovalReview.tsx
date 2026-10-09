"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { TextField } from "@/components/ui/TextField/TextField";
import { formatCountdown, formatDate, formatTime } from "@/lib/format";
import { approvePairingAction, rejectPairingAction } from "../../actions";
import { devicesCopy } from "../../copy";
import type { PairingReviewDto, ProfileOption } from "../../types";
import styles from "./ApprovalReview.module.css";

export function ApprovalReview({ review, profiles, preselected }: {
  review: PairingReviewDto; profiles: ProfileOption[]; preselected?: string;
}) {
  const [profileId, setProfileId] = useState(profiles.some((p) => p.id === preselected) ? preselected ?? "" : "");
  const [label, setLabel] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<{ message: string; fieldErrors?: Record<string, string[] | undefined> } | null>(null);
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);
  const [pendingDecision, setPendingDecision] = useState<"approve" | "reject" | null>(null);
  const isPending = pendingDecision !== null;
  const [isExpired, setIsExpired] = useState(false);
  const [remaining, setRemaining] = useState<string | null>(null);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
    const timer = setTimeout(() => setIsExpired(true), Math.max(0, Date.parse(review.expiresAt) - Date.now()));
    const update = () => setRemaining(formatCountdown(Date.parse(review.expiresAt) - Date.now()));
    const first = setTimeout(update, 0);
    const interval = setInterval(update, 15_000);
    return () => { clearTimeout(timer); clearTimeout(first); clearInterval(interval); };
  }, [review.expiresAt]);
  async function decide(decision: "approve" | "reject") {
    if (inFlight.current) return;
    inFlight.current = true; setPendingDecision(decision); setError(null);
    try {
      const input = { pairingId: review.pairingId, reviewTicket: review.reviewTicket, expiresAt: review.expiresAt };
      const response = decision === "approve" ? await approvePairingAction({ ...input, profileId, label, confirmed })
        : await rejectPairingAction({ ...input, confirmed: true });
      if (response.ok) { setResult(decision === "approve" ? "approved" : "rejected"); requestAnimationFrame(() => headingRef.current?.focus()); }
      else { setError(response.error); requestAnimationFrame(() => errorRef.current?.focus()); }
    } catch { setError({ message: devicesCopy.errors.INTERNAL }); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { inFlight.current = false; setPendingDecision(null); }
  }
  return <section className={styles.review} aria-labelledby="review-title">
    <h2 ref={headingRef} id="review-title" tabIndex={-1}>{devicesCopy.reviewTitle}</h2>
    {result ? <><p role="status">{result === "approved" ? devicesCopy.approvedManager : devicesCopy.rejectedManager}</p>
      <ActionLink href="/family/devices">{devicesCopy.backDevices}</ActionLink></> : <>
      <p>{review.userAgentSummary}</p><p className={styles.notice}>{devicesCopy.browserNotice}</p>
      <dl className={styles.facts}>
        <div><dt>{devicesCopy.requested}</dt><dd><time dateTime={review.createdAt}>{formatDate(review.createdAt)} · {formatTime(review.createdAt)} {devicesCopy.utc}</time></dd></div>
        <div><dt>{devicesCopy.expiresAt}</dt><dd><time dateTime={review.expiresAt}>{formatTime(review.expiresAt)} {devicesCopy.utc}</time></dd></div>
      </dl>
      {remaining ? <p>{devicesCopy.timeRemaining(remaining)}</p> : null}
      {isExpired ? <p role="status">{devicesCopy.expired}</p> : null}
      <form noValidate aria-busy={isPending} onSubmit={(event) => { event.preventDefault(); void decide("approve"); }}>
        {error ? <p ref={errorRef} role="alert" tabIndex={-1} className={styles.error}>{error.message}</p> : null}
        <fieldset disabled={isPending || isExpired} className={styles.review}>
          <legend>{devicesCopy.approve}</legend>
          <div className={styles.select}><label htmlFor="device-profile">{devicesCopy.profile}</label>
            <select id="device-profile" name="profileId" value={profileId} onChange={(event) => setProfileId(event.target.value)}
              aria-invalid={error?.fieldErrors?.profileId ? true : undefined} aria-describedby={error?.fieldErrors?.profileId ? "device-profile-error" : undefined}>
              <option value="">{devicesCopy.chooseProfile}</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
            </select>
            {error?.fieldErrors?.profileId ? <p id="device-profile-error" className={styles.error}>{devicesCopy.chooseProfile}</p> : null}
          </div>
          <TextField name="label" className={styles.field} label={devicesCopy.label} hint={devicesCopy.labelHint} maxLength={40}
            value={label} onChange={(event) => setLabel(event.target.value)} error={error?.fieldErrors?.label?.[0]} />
          <Checkbox name="confirmed" label={devicesCopy.confirmation} checked={confirmed}
            error={error?.fieldErrors?.confirmed ? devicesCopy.errors.confirm : undefined}
            onChange={(event) => setConfirmed(event.target.checked)} />
          <div className={styles.actions}>
            <Button type="submit" disabled={!confirmed || isPending || isExpired} loading={pendingDecision === "approve"}>
              {pendingDecision === "approve" ? devicesCopy.busy : devicesCopy.approve}</Button>
            <Button variant="secondary" disabled={isPending || isExpired} loading={pendingDecision === "reject"}
              onClick={() => void decide("reject")}>{pendingDecision === "reject" ? devicesCopy.busy : devicesCopy.reject}</Button>
          </div>
        </fieldset>
      </form>
      {isExpired ? <ActionLink href="/family/devices/connect">{devicesCopy.retry}</ActionLink> : null}
    </>}
  </section>;
}
