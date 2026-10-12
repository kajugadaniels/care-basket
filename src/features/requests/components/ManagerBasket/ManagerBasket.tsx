"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Toast } from "@/components/ui/Toast/Toast";
import { requestsCopy } from "../../copy";
import { MAX_ITEM_QUANTITY } from "../../limits";
import { useManagerBasket } from "../../hooks/use-manager-basket";
import type { ManagerDetailDto } from "../../types";
import { RequestItem } from "../RequestUi/RequestItem";
import styles from "./ManagerBasket.module.css";

export function ManagerBasket({
  request,
  children,
}: {
  request: ManagerDetailDto;
  children?: ReactNode;
}) {
  const id = useId();
  const {
    pendingKey,
    error,
    errorRef,
    preview,
    notice,
    dismiss,
    sound,
    save,
    remove,
    blockIfBusy,
  } = useManagerBasket(request);
	const previewing = !error && (pendingKey?.startsWith("save:") ?? false);

  return (
    <div className={styles.layout}>
      <section
        className={styles.itemsPanel}
        aria-labelledby={`${id}-items-title`}
      >
        <header className={styles.itemsHeader}>
          <h2 id={`${id}-items-title`}>{requestsCopy.managerItems}</h2>
          <span className={styles.caption}>
            {requestsCopy.count(request.items.length)}
          </span>
					<Button size="sm" variant="secondary" aria-pressed={sound.enabled} onClick={sound.toggle}>
						{sound.enabled ? requestsCopy.soundOn : requestsCopy.soundOff}
					</Button>
        </header>
        {error ? (
          <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        {request.items.length ? (
          <ul className={styles.list} aria-label={requestsCopy.managerItems}>
            {preview.items.map((item, index) => (
              <li key={item.id} className={styles.row}>
                <RequestItem product={item} variant="manager">
                  <p className={styles.origin}>
                    <span
                      className={
                        item.origin === "SUGGESTED" ? styles.badge : undefined
                      }
                    >
                      {requestsCopy.origins[item.origin]}
                    </span>
                    {item.isSubstitute ? (
                      <span className={styles.badge}>
                        {requestsCopy.substitute}
                      </span>
                    ) : null}
                  </p>
                  {item.substitutionNote ? (
                    <p className={styles.note}>{item.substitutionNote}</p>
                  ) : null}
                  <dl className={styles.prices}>
                    <div>
                      <dt>{requestsCopy.unit}</dt>
                      <dd>{item.unitPrice}</dd>
                    </div>
                    <div>
                      <dt>{requestsCopy.line}</dt>
                      <dd className={styles.lineTotal}>{item.lineTotal}</dd>
                    </div>
                  </dl>
                </RequestItem>
                {request.editable ? (
                  <form
                    className={styles.actions}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (blockIfBusy()) return;
                      const data = new FormData(event.currentTarget);
                      const quantity = Number(data.get("quantity"));
                      save(item, quantity);
                    }}
                  >
                    <div className={styles.quantity}>
                      <label htmlFor={`${id}-${item.id}`}>
                        {requestsCopy.quantity}
                      </label>
                      {/* Only confirmed quantity changes reset a field; previews must preserve its draft. */}
                      <input
                        key={`${item.id}:${request.items[index].quantity}`}
                        id={`${id}-${item.id}`}
                        name="quantity"
                        type="number"
                        min={1}
                        max={MAX_ITEM_QUANTITY}
                        aria-label={`${requestsCopy.quantity}: ${item.displayName}`}
                        step={1}
                        defaultValue={request.items[index].quantity}
                        required
                        disabled={
                          pendingKey === `save:${item.id}` ||
                          pendingKey === `remove:${item.id}`
                        }
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      onClick={(event) => {
                        if (blockIfBusy()) event.preventDefault();
                      }}
                    >
                      {requestsCopy.save}
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={request.items.length === 1}
                      aria-label={`${requestsCopy.remove}: ${item.displayName}`}
                      onClick={() => remove(item)}
                    >
                      {requestsCopy.remove}
                    </Button>
										{!error && pendingKey === `save:${item.id}` ? (
											<span className={styles.syncing}>{requestsCopy.managerSyncing}</span>
										) : null}
										{!error && pendingKey === `remove:${item.id}` ? (
											<span className={styles.syncing}>{requestsCopy.managerRemoving}</span>
										) : null}
                  </form>
                ) : (
                  <p className={styles.readOnlyQuantity}>
                    {requestsCopy.quantity}: {item.quantity}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>{requestsCopy.managerEmptyItems}</p>
        )}
      </section>

      <section
        className={styles.summary}
        aria-labelledby={`${id}-summary-title`}
      >
        <h2 id={`${id}-summary-title`}>{requestsCopy.managerSummary}</h2>
        <p className={styles.caption}>
          {requestsCopy.count(request.items.length)}
        </p>
        <dl className={styles.total}>
          <dt>{requestsCopy.total}</dt>
          <dd>{preview.subtotal}</dd>
        </dl>
				{previewing ? <p className={styles.syncing}>{requestsCopy.managerPreview}</p> : null}
        {request.budget ? (
          <dl className={styles.budget}>
            <dt>{requestsCopy.budget}</dt>
            <dd>{request.budget}</dd>
          </dl>
        ) : null}
        {request.editable ? (
          <p className={styles.note}>{requestsCopy.managerReviewHelp}</p>
        ) : null}
        <fieldset
          className={styles.summaryActions}
          onClickCapture={(event) => {
            if (blockIfBusy()) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          {children}
        </fieldset>
      </section>
      <Toast
        notice={notice}
        dismissLabel={
          notice?.kind === "error"
            ? requestsCopy.dismissError
            : requestsCopy.dismissSuccess
        }
        onDismiss={dismiss}
      />
    </div>
  );
}
