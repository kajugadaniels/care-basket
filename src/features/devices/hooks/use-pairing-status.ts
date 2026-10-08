"use client";

import { useEffect, useState } from "react";
import { pairingStatusSchema } from "../schemas";
import type { PairingStatus } from "../types";

function isDocumentHidden() {
  return document.visibilityState === "hidden";
}

export function usePairingStatus(expiresAt: string, retryKey: number) {
  const [status, setStatus] = useState<PairingStatus>("PENDING");
  const [hasError, setHasError] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);
  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let final = false;
    let retryAt = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const deadline = Date.parse(expiresAt);
    const expiry = setTimeout(() => { final = true; setStatus("EXPIRED"); clearTimeout(timeout); controller.abort(); }, Math.max(0, deadline - Date.now()));
    const warning = setTimeout(() => setIsExpiring(true), Math.max(0, deadline - Date.now() - 60_000));
    async function poll() {
      if (stopped || final || inFlight || isDocumentHidden()) return;
      if (Date.now() < retryAt) { timeout = setTimeout(poll, retryAt - Date.now()); return; }
      inFlight = true;
      const requestController = new AbortController();
      const abortRequest = () => requestController.abort();
      controller.signal.addEventListener("abort", abortRequest, { once: true });
      const requestTimeout = setTimeout(abortRequest, 10_000);
      try {
        const response = await fetch("/api/pairing/status", { credentials: "same-origin", cache: "no-store", signal: requestController.signal });
        if (stopped || final) return;
        if (response.status === 429) {
          const seconds = Number(response.headers.get("Retry-After"));
          retryAt = Date.now() + (Number.isFinite(seconds) && seconds > 0 ? Math.max(15, seconds) : 60) * 1000;
          setHasError(true);
          return;
        }
        if (!response.ok) { if (response.status === 401) { final = true; setStatus("EXPIRED"); } else setHasError(true); return; }
        const body: unknown = await response.json();
        const data = body && typeof body === "object" && "data" in body ? body.data : undefined;
        const parsed = pairingStatusSchema.safeParse(data);
        if (!parsed.success) { setHasError(true); return; }
        if (!stopped && !final) {
          setHasError(false); setStatus(parsed.data.status);
          final = parsed.data.status !== "PENDING";
          if (final) { clearTimeout(expiry); clearTimeout(warning); }
        }
      } catch { if (!stopped && !controller.signal.aborted) setHasError(true); }
      finally {
        clearTimeout(requestTimeout); controller.signal.removeEventListener("abort", abortRequest);
        inFlight = false;
        if (!stopped && !final && !isDocumentHidden()) {
          clearTimeout(timeout); timeout = setTimeout(poll, Math.max(15_000, retryAt - Date.now()));
        }
      }
    }
    function resume() { clearTimeout(timeout); if (!isDocumentHidden()) void poll(); }
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    void poll();
    return () => {
      stopped = true; controller.abort(); clearTimeout(timeout); clearTimeout(expiry); clearTimeout(warning);
      document.removeEventListener("visibilitychange", resume); window.removeEventListener("focus", resume);
    };
  }, [expiresAt, retryKey]);
  return { status, hasError, isExpiring };
}
