"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CancelCircleIcon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import {
  cancelCheckoutAction,
  captureCheckoutAction,
  refreshCheckoutAction,
  startCheckoutAction,
} from "../../actions";
import { checkoutCopy as copy } from "../../copy";
import type { CheckoutDto } from "../../types";
import { BuyerApproval } from "../PayPalCheckoutButton/BuyerApproval";
import { PaymentConfirmation } from "./PaymentConfirmation";
import styles from "./CheckoutPanel.module.css";

export function CheckoutPanel({
  requestId,
  revision,
  editable,
  checkout,
}: {
  requestId: string;
  revision: number;
  editable: boolean;
  checkout: CheckoutDto | null;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, transition] = useTransition();
  const [refreshingPage, refreshPage] = useTransition();
  const [local, setLocal] = useState<{
    revision: number;
    checkout: CheckoutDto | null;
    source: CheckoutDto | null;
  } | null>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [operation, setOperation] = useState<
    "start" | "cancel" | "refresh" | "capture"
  >("start");
  const busy = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelTrigger = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const lastPageRefresh = useRef(0);
  // New server data (including refunds with an unchanged request revision) always wins.
  const current =
    local?.revision === revision && local.source === checkout
      ? local.checkout
      : checkout;
  const waiting =
    current !== null &&
    ["PREPARED", "APPROVED", "PENDING", "REVIEW_REQUIRED"].includes(
      current.state,
    );
  const final =
    current !== null &&
    ["CAPTURED", "DENIED", "REFUNDED", "REVERSED"].includes(current.state);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (!waiting || pending || refreshingPage) return;
    function refreshVisiblePage() {
      if (
        document.visibilityState === "hidden" ||
        busy.current ||
        Date.now() - lastPageRefresh.current < 1_000
      )
        return;
      lastPageRefresh.current = Date.now();
      // Observe persisted webhook results only; polling never creates or captures an order.
      refreshPage(() => router.refresh());
    }
    const timer = window.setInterval(refreshVisiblePage, 20_000);
    window.addEventListener("focus", refreshVisiblePage);
    document.addEventListener("visibilitychange", refreshVisiblePage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisiblePage);
      document.removeEventListener("visibilitychange", refreshVisiblePage);
    };
  }, [waiting, pending, refreshingPage, router]);

  function run(kind: "start" | "cancel" | "refresh" | "capture") {
    if (busy.current || pending) {
      setError(copy.busy);
      return;
    }
    busy.current = true;
    setOperation(kind);
    setError("");
    setAnnouncement("");
    transition(async () => {
      try {
        if (kind === "start") {
          const result = await startCheckoutAction({ requestId, revision });
          if (!result.ok) {
            setError(result.error.message);
            return;
          }
          setLocal({ revision, checkout: result.data, source: checkout });
        } else if (
          (kind === "refresh" || kind === "capture") &&
          current?.orderId
        ) {
          const action =
            kind === "capture" ? captureCheckoutAction : refreshCheckoutAction;
          const result = await action({
            requestId,
            paypalOrderId: current.orderId,
          });
          if (!result.ok) {
            setError(result.error.message);
            return;
          }
          setLocal({ revision, checkout: result.data, source: checkout });
        } else if (current) {
          const result = await cancelCheckoutAction({
            requestId,
            revision,
            paymentId: current.paymentId,
            confirmed: true,
          });
          if (!result.ok) {
            setError(result.error.message);
            return;
          }
          setLocal({ revision, checkout: null, source: checkout });
          setAnnouncement(copy.cancelled);
        }
      } catch {
        setError(copy.errors.INTERNAL);
      } finally {
        dialog.current?.close();
        busy.current = false;
      }
    });
  }

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{copy.paymentTitle}</h2>
      {current ? (
        <>
          <PaymentConfirmation checkout={current} />
          {!["CAPTURED", "REFUNDED", "REVERSED", "DENIED"].includes(
            current.state,
          ) ? (
            <p className={styles.help}>{copy.locked}</p>
          ) : null}
          {current.orderId ? (
            <dl className={styles.reference}>
              <dt>{copy.order}</dt>
              <dd>{current.orderId}</dd>
            </dl>
          ) : null}
          {!current.buyerApprovalEnabled &&
          ["PREPARED", "PREPARING"].includes(current.state) ? (
            <p className={styles.help}>{copy.unavailable}</p>
          ) : null}
          <BuyerApproval
            requestId={requestId}
            revision={revision}
            checkout={current}
            onResult={(result) => {
              setError("");
              setLocal({ revision, checkout: result, source: checkout });
            }}
            onError={setError}
          />
        </>
      ) : null}
      {error ? (
        <div className={styles.errorFeedback}>
          <span className={styles.errorIcon} aria-hidden="true">
            <Icon icon={CancelCircleIcon} size={32} />
          </span>
          <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>
            {error}
          </p>
        </div>
      ) : null}
      {(editable && (!current || current.state === "DENIED")) ||
      current?.state === "PREPARING" ? (
        <Button
          loading={pending && operation === "start"}
          disabled={pending}
          onClick={() => run("start")}
        >
          {pending && operation === "start"
            ? copy.preparing
            : current
              ? copy.retry
              : copy.prepare}
        </Button>
      ) : null}
      {current?.orderId &&
      ["PREPARED", "REVIEW_REQUIRED", "APPROVED", "PENDING"].includes(
        current.state,
      ) ? (
        <Button
          variant="secondary"
          loading={pending && operation === "refresh"}
          onClick={() => run("refresh")}
        >
          {copy.refresh}
        </Button>
      ) : null}
      {current?.orderId && current.state === "REVIEW_REQUIRED" ? (
        <Button variant="secondary" onClick={() => run("capture")}>
          {copy.retryCapture}
        </Button>
      ) : null}
      {current &&
      current.canCancel !== false &&
      ["PREPARING", "PREPARED"].includes(current.state) ? (
        <Button
          ref={cancelTrigger}
          variant="secondary"
          disabled={pending}
          onClick={() => {
            dialog.current?.showModal();
            keep.current?.focus();
          }}
        >
          {copy.cancel}
        </Button>
      ) : null}
      <ActionLink
        href={`/family/requests/${requestId}`}
        variant={final ? "primary" : "secondary"}
        className={styles.back}
      >
        {copy.back}
      </ActionLink>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={`${id}-cancel-title`}
        aria-describedby={`${id}-cancel-help`}
        onClose={() => cancelTrigger.current?.focus()}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div className={styles.dialogContent}>
          <h2 id={`${id}-cancel-title`}>{copy.cancelTitle}</h2>
          <p id={`${id}-cancel-help`}>{copy.cancelHelp}</p>
          <div className={styles.actions}>
            <Button
              ref={keep}
              variant="secondary"
              disabled={pending}
              onClick={() => dialog.current?.close()}
            >
              {copy.keep}
            </Button>
            <Button
              variant="destructive"
              loading={pending}
              onClick={() => run("cancel")}
            >
              {pending ? copy.cancelling : copy.confirmCancel}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
