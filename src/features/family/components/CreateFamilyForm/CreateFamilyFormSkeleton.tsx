import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { TextFieldSkeleton } from "@/components/ui/TextField/TextFieldSkeleton";
import { familySetupCopy } from "@/features/family/copy";
import styles from "./CreateFamilyForm.module.css";

// Mirrors CreateFamilyForm. The display name is prefilled from the account, so it is a placeholder.
export function CreateFamilyFormSkeleton() {
	return (
		<LoadingState label={familySetupCopy.loading} className={styles.form}>
			<TextFieldSkeleton label={familySetupCopy.familyNameLabel} hint={familySetupCopy.familyNameHint} />
			<TextFieldSkeleton label={familySetupCopy.displayNameLabel} hint={familySetupCopy.displayNameHint} withValue />
			<Skeleton shape="pill" className={styles.submitSkeleton} />
		</LoadingState>
	);
}
