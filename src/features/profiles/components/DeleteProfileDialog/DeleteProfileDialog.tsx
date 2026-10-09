"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { deleteManagedProfileAction } from "@/features/profiles/actions";
import { profilesCopy } from "@/features/profiles/copy";
import type { ProfileMutationResult } from "@/features/profiles/types";
import styles from "./DeleteProfileDialog.module.css";

export function DeleteProfileDialog({ profileId, displayName }: { profileId: string; displayName: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, formAction, isPending] = useActionState<ProfileMutationResult | null, FormData>(
    async (_previous, data) => deleteManagedProfileAction({
      profileId, confirmed: data.get("confirmed") === "on",
    }), null,
  );
  const error = result && !result.ok ? result.error : null;

  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  return (
    <>
      <button ref={triggerRef} type="button" className={styles.trigger}
        onClick={() => {
          setConfirmed(false);
          dialogRef.current?.showModal();
          cancelRef.current?.focus();
        }}>
        {profilesCopy.remove}
      </button>
      <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="delete-profile-title"
        aria-describedby="delete-profile-description" onClose={() => triggerRef.current?.focus()}
        onCancel={() => dialogRef.current?.close()}>
        <form action={formAction} noValidate className={styles.content} aria-busy={isPending}
          onReset={(event) => event.preventDefault()}
          onSubmit={(event) => { if (isPending) event.preventDefault(); }}>
          <h2 id="delete-profile-title">{profilesCopy.removeTitle(displayName)}</h2>
          <p id="delete-profile-description">{profilesCopy.removeText(displayName)}</p>
          {error ? <p ref={errorRef} tabIndex={-1} role="alert" className={styles.error}>{error.message}</p> : null}
          <Checkbox name="confirmed" label={profilesCopy.removeConfirm(displayName)} checked={confirmed}
            required disabled={isPending} error={error?.fieldErrors?.confirmed?.[0]}
            onChange={(event) => setConfirmed(event.target.checked)} />
          <div className={styles.actions}>
            <button ref={cancelRef} type="button" className={styles.cancel}
              onClick={() => dialogRef.current?.close()}>{profilesCopy.cancel}</button>
            <Button type="submit" variant="destructive" disabled={!confirmed} loading={isPending}>
              {isPending ? profilesCopy.removing : profilesCopy.remove}
            </Button>
          </div>
          {/* The button shows the progress; this announces it to screen readers. */}
          <p role="status" className={styles.visuallyHidden}>{isPending ? profilesCopy.removing : ""}</p>
        </form>
      </dialog>
    </>
  );
}
