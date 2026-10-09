import { FamilyWelcomeSkeleton } from "@/features/family/components/FamilyWelcome/FamilyWelcomeSkeleton";
import { SetupPreview } from "@/features/family/components/SetupPreview/SetupPreview";
import styles from "./page.module.css";

// Matches the overview page: the static preview is real, the personal overview is a skeleton.
export default function FamilyLoading() {
	return (
		<div className={styles.page}>
			<FamilyWelcomeSkeleton />
			<SetupPreview />
		</div>
	);
}
