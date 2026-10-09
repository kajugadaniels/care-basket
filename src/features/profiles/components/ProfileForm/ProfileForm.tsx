"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { TextField } from "@/components/ui/TextField/TextField";
import { DISPLAY_NAME_MAX_LENGTH } from "@/features/family/limits";
import { createManagedProfileAction, updateManagedProfileAction } from "@/features/profiles/actions";
import { ProfileChoices } from "@/features/profiles/components/ProfileChoices/ProfileChoices";
import { profilesCopy } from "@/features/profiles/copy";
import type { ManagedProfileDto, ProfileAvatarKey, ProfileKind, ProfileMutationResult } from "@/features/profiles/types";
import styles from "./ProfileForm.module.css";

export function ProfileForm({ profile }: { profile?: ManagedProfileDto }) {
	const [name, setName] = useState(profile?.displayName ?? "");
	const [kind, setKind] = useState<ProfileKind | "">(profile?.kind ?? "");
	const [avatarKey, setAvatarKey] = useState<ProfileAvatarKey>(profile?.avatarKey ?? "smile");
	const [consent, setConsent] = useState(false);
	const formRef = useRef<HTMLFormElement>(null);
	const summaryRef = useRef<HTMLParagraphElement>(null);
	const [result, formAction, isPending] = useActionState<ProfileMutationResult | null, FormData>(
		async (_previous, data) => {
			const fields = { displayName: data.get("displayName"), avatarKey: data.get("avatarKey") };
			return profile
				? updateManagedProfileAction({ ...fields, profileId: profile.id })
				: createManagedProfileAction({ ...fields, kind: data.get("kind"), consent: data.get("consent") === "on" });
		},
		null,
	);
	const error = result && !result.ok ? result.error : null;
	const fieldErrors = error?.fieldErrors ?? {};
	const pendingText = profile ? profilesCopy.saving : profilesCopy.adding;

	useEffect(() => {
		if (!error) return;
		const invalid = formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]');
		(invalid ?? summaryRef.current)?.focus();
	}, [error]);

	return (
		<form
			ref={formRef}
			action={formAction}
			noValidate
			className={styles.form}
			aria-busy={isPending}
			onReset={(event) => event.preventDefault()}
			onSubmit={(event) => {
				if (isPending) event.preventDefault();
			}}
		>
			{error ? (
				<p ref={summaryRef} tabIndex={-1} role="alert" className={styles.error}>
					{error.message}
				</p>
			) : null}
			<fieldset disabled={isPending} className={styles.fields}>
				<TextField
					name="displayName"
					label={profilesCopy.nameLabel}
					hint={profilesCopy.nameHint}
					placeholder={profilesCopy.nameExample}
					error={fieldErrors.displayName?.[0]}
					value={name}
					onChange={(event) => setName(event.target.value)}
					maxLength={DISPLAY_NAME_MAX_LENGTH}
					autoComplete="off"
					required
					className={styles.nameField}
				/>
				{profile ? (
					<p>
						<strong>{profilesCopy.kindLabel}: </strong>
						{profilesCopy.kinds[profile.kind]}
					</p>
				) : (
					<ProfileChoices
						group="kind"
						value={kind}
						error={fieldErrors.kind?.[0]}
						onChange={(value) => setKind(value as ProfileKind)}
					/>
				)}
				<ProfileChoices
					group="avatarKey"
					value={avatarKey}
					error={fieldErrors.avatarKey?.[0]}
					onChange={(value) => setAvatarKey(value as ProfileAvatarKey)}
				/>
				{profile ? null : (
					<div className={styles.consent}>
						<p className={styles.label}>{profilesCopy.consentLabel}</p>
						<Checkbox
							name="consent"
							label={profilesCopy.consent}
							hint={profilesCopy.consentHint}
							error={fieldErrors.consent?.[0]}
							checked={consent}
							required
							onChange={(event) => setConsent(event.target.checked)}
						/>
					</div>
				)}
			</fieldset>
			<p className={styles.notice}>{profilesCopy.aiNotice}</p>
			<div className={styles.actions}>
				<Button type="submit" loading={isPending}>
					{isPending ? pendingText : profile ? profilesCopy.save : profilesCopy.add}
				</Button>
				<ActionLink variant="secondary" href={profile ? `/family/members/${profile.id}` : "/family/members"}>
					{profilesCopy.cancel}
				</ActionLink>
			</div>
			{/* The button shows the progress; this announces it to screen readers. */}
			<p role="status" className={styles.visuallyHidden}>
				{isPending ? pendingText : ""}
			</p>
		</form>
	);
}
