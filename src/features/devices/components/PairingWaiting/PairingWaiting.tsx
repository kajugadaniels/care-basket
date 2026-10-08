"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { completePairingAction } from "../../actions";
import { devicesCopy } from "../../copy";
import { usePairingStatus } from "../../hooks/use-pairing-status";
import type { PairingStartDto } from "../../types";
import styles from "./PairingWaiting.module.css";

export function PairingWaiting({ pairing, onRestart }: { pairing: PairingStartDto; onRestart(): void }) {
  const [retryKey, setRetryKey] = useState(0);
  const { status, hasError, isExpiring } = usePairingStatus(pairing.expiresAt, retryKey);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionRetry, setCompletionRetry] = useState(0);
  const attempted = useRef(false);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const finish = useEffectEvent(async () => {
    if (attempted.current) return;
    attempted.current = true; setIsCompleting(true); setCompletionError(null);
    try {
      const result = await completePairingAction({});
      if (result && !result.ok) setCompletionError(result.error.code === "CONFLICT" ? devicesCopy.completionFailed : result.error.message);
    } catch { setCompletionError(devicesCopy.errors.INTERNAL); }
    finally { setIsCompleting(false); }
  });
  useEffect(() => {
    let cancelled = false;
    if (status === "APPROVED") {
      queueMicrotask(() => { if (!cancelled) void finish(); });
    }
    if (status !== "PENDING") statusRef.current?.focus();
    return () => { cancelled = true; };
  }, [status, completionRetry]);
  const message = status === "PENDING" ? devicesCopy.waiting : status === "APPROVED" ? devicesCopy.approved
    : status === "EXPIRED" ? devicesCopy.expired : status === "REJECTED" ? devicesCopy.rejected : devicesCopy.completed;
  return <section className={styles.waiting} aria-label={devicesCopy.codeLabel}>
    {status === "PENDING" ? <>
      <p>{devicesCopy.instructions}</p>
      <output className={styles.code} aria-label={`${devicesCopy.codeLabel}: ${pairing.code.split("").join(" ")}`}>
        {pairing.code.slice(0, 3)} {pairing.code.slice(3)}
      </output>
      <p>{devicesCopy.expires}</p>
      <p role="status">{isExpiring ? devicesCopy.expiresSoon : ""}</p>
    </> : null}
    <p ref={statusRef} tabIndex={-1} role="status" className={styles.status}>{message}</p>
    {hasError || completionError ? <p role="alert" className={styles.error}>{completionError ?? devicesCopy.network}</p> : null}
    {hasError && status === "PENDING" ? <Button className={styles.action} onClick={() => setRetryKey((n) => n + 1)}>{devicesCopy.retry}</Button> : null}
    {completionError && status === "APPROVED" ? <Button className={styles.action} disabled={isCompleting} aria-busy={isCompleting}
      onClick={() => { attempted.current = false; setCompletionRetry((n) => n + 1); }}>{devicesCopy.retry}</Button> : null}
    {status === "COMPLETED" ? <ActionLink size="lg" href="/shop">{devicesCopy.open}</ActionLink> : null}
    {["EXPIRED", "REJECTED", "COMPLETED"].includes(status) || completionError ?
      <Button variant="secondary" className={styles.action} onClick={onRestart} disabled={isCompleting}>{devicesCopy.restart}</Button> : null}
  </section>;
}
