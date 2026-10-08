"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { startPairingAction } from "../../actions";
import { devicesCopy } from "../../copy";
import type { PairingStartDto } from "../../types";
import { PairingWaiting } from "../PairingWaiting/PairingWaiting";
import styles from "./ConnectDevice.module.css";

export function ConnectDevice() {
  const [pairing, setPairing] = useState<PairingStartDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  async function start() {
    if (inFlight.current) return;
    inFlight.current = true; setIsPending(true); setError(null);
    try {
      const result = await startPairingAction({});
      if (result.ok) { setPairing(result.data); headingRef.current?.focus(); }
      else setError(result.error.message);
    } catch { setError(devicesCopy.errors.INTERNAL); }
    finally { inFlight.current = false; setIsPending(false); }
  }
  return <div className={styles.content}>
    <h1 ref={headingRef} tabIndex={-1}>{devicesCopy.connectTitle}</h1>
    {pairing ? <PairingWaiting key={pairing.expiresAt} pairing={pairing} onRestart={() => setPairing(null)} />
      : <><p>{devicesCopy.connectDescription}</p>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <Button className={styles.action} disabled={isPending} aria-busy={isPending} onClick={() => void start()}>
          {isPending ? devicesCopy.starting : devicesCopy.start}</Button>
        <p role="status">{isPending ? devicesCopy.starting : ""}</p></>}
  </div>;
}
