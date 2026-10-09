import { ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cx } from "@/lib/class-names";
import { catalogCopy } from "../../copy";
import { ProductCardSkeleton } from "../ProductCard/ProductCardSkeleton";
import styles from "./ManagerCatalog.module.css";

// Two full rows at the widest grid, so the first screen is covered at every breakpoint.
const PLACEHOLDER_CARDS = Array.from({ length: 8 }, (_, index) => `placeholder-${index}`);

// Mirrors ManagerCatalog: the toolbar's labels and field frames are real, values are placeholders.
export function ManagerCatalogSkeleton() {
	return (
		<LoadingState label={catalogCopy.managerLoading} className={styles.catalog}>
			<div className={styles.toolbar} aria-hidden="true">
				<div className={styles.field}>
					<p className={styles.label}>{catalogCopy.productSearchLabel}</p>
					<div className={styles.control}>
						<Icon icon={Search01Icon} size={20} className={styles.leadingIcon} />
						<div className={cx(styles.input, styles.searchInput, styles.inputSkeleton)} />
					</div>
				</div>
				<div className={styles.field}>
					<p className={styles.label}>{catalogCopy.categorySelectLabel}</p>
					<div className={styles.control}>
						<div className={cx(styles.input, styles.select, styles.inputSkeleton)}>
							<Skeleton className={styles.selectValueSkeleton} />
						</div>
						<Icon icon={ArrowDown01Icon} size={20} className={styles.trailingIcon} />
					</div>
				</div>
				<Skeleton shape="pill" className={styles.submitSkeleton} />
			</div>

			<div className={styles.resultsBar}>
				<Skeleton className={cx(styles.results, styles.resultsSkeleton)} />
			</div>

			<ul className={styles.grid} aria-hidden="true">
				{PLACEHOLDER_CARDS.map((key) => (
					<li key={key}>
						<ProductCardSkeleton />
					</li>
				))}
			</ul>
		</LoadingState>
	);
}
