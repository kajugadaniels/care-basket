import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { TextFieldSkeleton } from "@/components/ui/TextField/TextFieldSkeleton";
import { devicesCopy } from "../../copy";
import styles from "./ApprovalForm.module.css";

// Mirrors the empty code form shown while the family's profiles load.
export function ApprovalFormSkeleton() {
	return (
		<LoadingState label={devicesCopy.loadingApproval} className={styles.form}>
			<TextFieldSkeleton label={devicesCopy.codeInput} hint={devicesCopy.codeHint} className={styles.field} />
			<Skeleton shape="pill" className={styles.submitSkeleton} />
		</LoadingState>
	);
}
