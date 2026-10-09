import Form from "next/form";
import { ArrowDown01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { catalogCopy } from "../../copy";
import { PRODUCT_CATEGORIES } from "../../taxonomy";
import type { CatalogFilters } from "../../types";
import styles from "./ManagerCatalog.module.css";

// Search and category in one GET form, so the filters live in the URL and survive a refresh.
// Keyed by the filters, so the fields reset when a link or "Show All" changes them.
export function CatalogToolbar({ action, filters }: { action: string; filters: CatalogFilters }) {
	return (
		<Form
			action={action}
			key={`${filters.category}-${filters.q}`}
			prefetch={false}
			role="search"
			className={styles.toolbar}
		>
			<div className={styles.field}>
				<label htmlFor="catalog-search" className={styles.label}>
					{catalogCopy.productSearchLabel}
				</label>
				<div className={styles.control}>
					<Icon icon={Search01Icon} size={20} className={styles.leadingIcon} />
					<input
						id="catalog-search"
						type="search"
						name="q"
						defaultValue={filters.q}
						maxLength={80}
						placeholder={catalogCopy.searchPlaceholder}
						autoComplete="off"
						className={cx(styles.input, styles.searchInput)}
					/>
				</div>
			</div>
			<div className={styles.field}>
				<label htmlFor="catalog-category" className={styles.label}>
					{catalogCopy.categorySelectLabel}
				</label>
				<div className={styles.control}>
					<select
						id="catalog-category"
						name="category"
						defaultValue={filters.category ?? ""}
						className={cx(styles.input, styles.select)}
					>
						<option value="">{catalogCopy.all}</option>
						{PRODUCT_CATEGORIES.map((category) => (
							<option key={category} value={category}>
								{catalogCopy.categories[category]}
							</option>
						))}
					</select>
					<Icon icon={ArrowDown01Icon} size={20} className={styles.trailingIcon} />
				</div>
			</div>
			<Button type="submit" className={styles.submit}>
				{catalogCopy.search}
			</Button>
		</Form>
	);
}
