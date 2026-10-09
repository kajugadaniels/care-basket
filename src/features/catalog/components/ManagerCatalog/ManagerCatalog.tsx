import Link from "next/link";
import { InformationCircleIcon, Search01Icon, ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { CATEGORY_ICONS } from "../../category-icons";
import { catalogCopy } from "../../copy";
import type { CatalogFilters, CatalogPage, ManagerProductDto } from "../../types";
import { catalogHref } from "../CatalogBrowser/catalog-href";
import { ProductCard } from "../ProductCard/ProductCard";
import { CatalogToolbar } from "./CatalogToolbar";
import styles from "./ManagerCatalog.module.css";

const BASE = "/family/catalog";

type ManagerCatalogProps = {
	filters: CatalogFilters;
	result: CatalogPage<ManagerProductDto>;
};

// The manager's catalog below the page header. ManagerCatalogSkeleton mirrors this layout.
export function ManagerCatalog({ filters, result }: ManagerCatalogProps) {
	const isFiltered = Boolean(filters.q || filters.category);
	const hasPagination = Boolean(result.nextCursor || result.previousCursor || filters.cursor || filters.before);

	return (
		<div className={styles.catalog}>
			<CatalogToolbar action={BASE} filters={filters} />

			<div className={styles.resultsBar}>
				<div className={styles.summary}>
					<p role="status" className={styles.results}>
						{catalogCopy.managerResults({ count: result.products.length })}
					</p>
					{isFiltered ? <ActiveFilters filters={filters} /> : null}
				</div>
				{isFiltered ? (
					<ActionLink href={BASE} variant="secondary" size="sm">
						{catalogCopy.clear}
					</ActionLink>
				) : null}
			</div>

			{result.products.length ? (
				<ul className={styles.grid} aria-label={catalogCopy.managerTitle}>
					{result.products.map((product) => (
						<li key={product.sku}>
							<ProductCard product={product} />
						</li>
					))}
				</ul>
			) : (
				<div className={styles.empty}>
					<span className={styles.emptyIcon}>
						<Icon icon={ShoppingBasket01Icon} size={32} />
					</span>
					<h2 className={styles.emptyTitle}>{isFiltered ? catalogCopy.noMatches : catalogCopy.empty}</h2>
					<p>{isFiltered ? catalogCopy.noMatchesHelp : catalogCopy.managerEmpty}</p>
				</div>
			)}

			{hasPagination ? (
				<nav className={styles.pagination} aria-label={catalogCopy.pages}>
					{result.previousCursor ? (
						<ActionLink href={catalogHref(BASE, { ...filters, cursor: undefined, before: result.previousCursor })} variant="secondary">{catalogCopy.previous}</ActionLink>
					) : filters.cursor || filters.before ? (
						<ActionLink href={catalogHref(BASE, { ...filters, cursor: undefined, before: undefined })} variant="secondary">
							{catalogCopy.first}
						</ActionLink>
					) : null}
					{result.nextCursor ? (
						<ActionLink href={catalogHref(BASE, { ...filters, before: undefined, cursor: result.nextCursor })}>{catalogCopy.more}</ActionLink>
					) : null}
				</nav>
			) : null}

			<div className={styles.notice}>
				<Icon icon={InformationCircleIcon} size={24} />
				<p>{catalogCopy.simulation}</p>
				<Link href="/data-sources" className={styles.noticeLink}>
					{catalogCopy.dataSources}
				</Link>
			</div>
		</div>
	);
}

function ActiveFilters({ filters }: { filters: CatalogFilters }) {
	return (
		<ul className={styles.activeFilters} aria-label={catalogCopy.activeFilters}>
			{filters.category ? (
				<li className={styles.filterChip}>
					<Icon icon={CATEGORY_ICONS[filters.category]} size={20} />
					{catalogCopy.categories[filters.category]}
				</li>
			) : null}
			{filters.q ? (
				<li className={styles.filterChip}>
					<Icon icon={Search01Icon} size={20} />
					{`“${filters.q}”`}
				</li>
			) : null}
		</ul>
	);
}
