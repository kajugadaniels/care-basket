import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { ProfileCardSkeleton } from "@/features/profiles/components/ProfileCard/ProfileCardSkeleton";
import { profilesCopy } from "@/features/profiles/copy";
import styles from "./ProfileList.module.css";

// Enough cards to fill the first row at every breakpoint of the real grid.
const PLACEHOLDER_CARDS = ["first", "second", "third"];

export function ProfileListSkeleton() {
	return (
		<LoadingState label={profilesCopy.loading}>
			<ul className={styles.grid} role="list" aria-hidden="true">
				{PLACEHOLDER_CARDS.map((key) => (
					<li key={key}>
						<ProfileCardSkeleton />
					</li>
				))}
			</ul>
		</LoadingState>
	);
}
