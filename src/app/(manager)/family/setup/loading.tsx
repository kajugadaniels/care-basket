import { CreateFamilyFormSkeleton } from "@/features/family/components/CreateFamilyForm/CreateFamilyFormSkeleton";
import { familySetupCopy } from "@/features/family/copy";
import styles from "./page.module.css";

// Matches the setup page, so the overview skeleton never stands in for it.
export default function FamilySetupLoading() {
	return (
		<div className={styles.page}>
			<hgroup>
				<h1 className={styles.title}>{familySetupCopy.title}</h1>
				<p className={styles.description}>{familySetupCopy.description}</p>
			</hgroup>

			<div className={styles.card}>
				<CreateFamilyFormSkeleton />
			</div>

			<p className={styles.reassurance}>{familySetupCopy.reassurance}</p>
		</div>
	);
}
