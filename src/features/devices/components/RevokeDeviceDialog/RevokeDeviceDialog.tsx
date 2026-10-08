"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { revokeDeviceAction } from "../../actions";
import { devicesCopy } from "../../copy";
import styles from "./RevokeDeviceDialog.module.css";

export function RevokeDeviceDialog({ deviceId, label }: { deviceId: string; label: string }) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isRevoked, setIsRevoked] = useState(false);
  useEffect(() => {
    if (isRevoked) (document.getElementById(`device-${deviceId}`) ?? statusRef.current)?.focus();
  }, [isRevoked, deviceId]);
  return <>
    {isRevoked ? <p ref={statusRef} tabIndex={-1} role="status">{devicesCopy.revoked}</p> : null}
    <Button ref={triggerRef} variant="secondary" disabled={isRevoked} onClick={() => {
      setConfirmed(false); setError(null); dialogRef.current?.showModal(); cancelRef.current?.focus();
    }}>{devicesCopy.revoke}</Button>
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
      onClose={() => {
        if (isRevoked) (document.getElementById(`device-${deviceId}`) ?? statusRef.current)?.focus();
        else triggerRef.current?.focus();
      }} onCancel={() => dialogRef.current?.close()}>
      <form className={styles.content} aria-busy={isPending} onSubmit={async (event) => {
        event.preventDefault(); if (inFlight.current) return;
        inFlight.current = true; setIsPending(true); setError(null);
        try {
          const result = await revokeDeviceAction({ deviceId, confirmed });
          if (result.ok) {
            dialogRef.current?.close(); setIsRevoked(true);
            // The refreshed server list may remove this control; the card heading stays.
            document.getElementById(`device-${deviceId}`)?.focus();
          }
          else { setError(result.error.message); requestAnimationFrame(() => errorRef.current?.focus()); }
        } catch { setError(devicesCopy.errors.INTERNAL); requestAnimationFrame(() => errorRef.current?.focus()); }
        finally { inFlight.current = false; setIsPending(false); }
      }}>
        <h2 id={`${id}-title`}>{devicesCopy.revokeTitle(label)}</h2>
        <p id={`${id}-description`}>{devicesCopy.revokeText}</p>
        {error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error}</p> : null}
        <label className={styles.confirmation}><input type="checkbox" checked={confirmed} disabled={isPending}
          onChange={(event) => setConfirmed(event.target.checked)} />{devicesCopy.revokeConfirm}</label>
        <div className={styles.actions}>
          <Button ref={cancelRef} variant="secondary" onClick={() => dialogRef.current?.close()}>{devicesCopy.cancel}</Button>
          <Button type="submit" className={styles.danger} disabled={!confirmed || isPending} aria-busy={isPending}>
            {isPending ? devicesCopy.busy : devicesCopy.revoke}</Button>
        </div>
      </form>
    </dialog>
  </>;
}
