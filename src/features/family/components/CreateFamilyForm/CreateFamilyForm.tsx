"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { Icon } from "@/components/ui/Icon/Icon";
import { TextField } from "@/components/ui/TextField/TextField";
import { useToast } from "@/components/ui/Toast/ToastProvider";
import { createFamilyAction } from "@/features/family/actions";
import { familySetupCopy } from "@/features/family/copy";
import { DISPLAY_NAME_MAX_LENGTH, FAMILY_NAME_MAX_LENGTH } from "@/features/family/limits";
import type { CreateFamilyFormState } from "@/features/family/types";
import styles from "./CreateFamilyForm.module.css";

type CreateFamilyFormProps = {
  // Prefilled from the adult's Clerk first name when available.
  defaultDisplayName: string;
};

export function CreateFamilyForm({ defaultDisplayName }: CreateFamilyFormProps) {
	const router = useRouter();
	const toast = useToast();
  const initialState: CreateFamilyFormState = {
    values: { familyName: "", displayName: defaultDisplayName },
    error: null,
		created: false,
		feedback: null,
  };
  const [state, formAction, isPending] = useActionState(createFamilyAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const fieldErrors = state.error?.fieldErrors ?? {};
  const familyNameError = fieldErrors.familyName?.[0];
  const displayNameError = fieldErrors.displayName?.[0];
	const adultConfirmationError = fieldErrors.adultConfirmed?.[0];
	const formError = state.error && !familyNameError && !displayNameError && !adultConfirmationError
		? state.error : null;

  // After a failed submission, move focus to the first field that needs attention.
  useEffect(() => {
		if (state.created) {
			if (state.feedback) toast.notify(state.feedback);
			router.replace("/family");
			return;
		}
    const firstInvalid = formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
		if (state.error) {
			toast.notify({ kind: "error", message: state.error.message });
		}
	}, [router, state, toast]);

  return (
    <form ref={formRef} action={formAction} noValidate className={styles.form}>
      {formError ? (
        <p className={styles.formError} role="alert">
          <Icon icon={Alert02Icon} size={24} className={styles.formErrorIcon} />
          {formError.message}
        </p>
      ) : null}

      <TextField
        name="familyName"
        label={familySetupCopy.familyNameLabel}
        hint={familySetupCopy.familyNameHint}
        error={familyNameError}
        defaultValue={state.values.familyName}
        maxLength={FAMILY_NAME_MAX_LENGTH}
        autoComplete="off"
        required
      />

      <TextField
        name="displayName"
        label={familySetupCopy.displayNameLabel}
        hint={familySetupCopy.displayNameHint}
        error={displayNameError}
        defaultValue={state.values.displayName}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        autoComplete="given-name"
        required
      />

			<Checkbox
				name="adultConfirmed"
				label={familySetupCopy.adultConfirmation}
				hint={familySetupCopy.adultConfirmationHint}
				error={adultConfirmationError}
				required
			/>

      {/* Disabled only while sending, so a double press cannot submit twice. */}
      <Button type="submit" loading={isPending} className={styles.submit}>
        {isPending ? familySetupCopy.submitting : familySetupCopy.submit}
      </Button>
    </form>
  );
}
