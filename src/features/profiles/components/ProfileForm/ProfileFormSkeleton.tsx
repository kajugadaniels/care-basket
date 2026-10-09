import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { TextFieldSkeleton } from "@/components/ui/TextField/TextFieldSkeleton";
import { ProfileChoicesSkeleton } from "@/features/profiles/components/ProfileChoices/ProfileChoicesSkeleton";
import { profilesCopy } from "@/features/profiles/copy";
import styles from "./ProfileForm.module.css";

// Mirrors ProfileForm: fixed labels and preset options are real, saved values are placeholders.
// When editing, the name and profile type come from the saved profile.
export function ProfileFormSkeleton({ isEditing = false }: { isEditing?: boolean }) {
	return (
		<LoadingState label={profilesCopy.loadingForm} className={styles.form}>
			<div className={styles.fields}>
				<TextFieldSkeleton
					label={profilesCopy.nameLabel}
					hint={profilesCopy.nameHint}
					withValue={isEditing}
					className={styles.nameField}
				/>
				{isEditing ? <Skeleton className={styles.kindSkeleton} /> : <ProfileChoicesSkeleton group="kind" />}
				<ProfileChoicesSkeleton group="avatarKey" />
				{isEditing ? null : (
					<div className={styles.consent} aria-hidden="true">
						<p className={styles.label}>{profilesCopy.consentLabel}</p>
						<Checkbox label={profilesCopy.consent} hint={profilesCopy.consentHint} disabled />
					</div>
				)}
			</div>
			<p className={styles.notice} aria-hidden="true">
				{profilesCopy.aiNotice}
			</p>
			<div className={styles.actions}>
				<Skeleton shape="pill" className={styles.submitSkeleton} />
				<Skeleton shape="pill" className={styles.cancelSkeleton} />
			</div>
		</LoadingState>
	);
}
