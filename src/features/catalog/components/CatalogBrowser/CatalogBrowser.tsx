import { InformationCircleIcon, ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { ProductSelection } from "@/features/requests/components/DraftProvider/ProductSelection";
import { DraftSummary } from "@/features/requests/components/DraftProvider/DraftSummary";
import { requestsCopy } from "@/features/requests/copy";
import { CATEGORY_ICONS } from "../../category-icons";
import { catalogCopy } from "../../copy";
import type { CatalogFilters, CatalogPage, CatalogProductDto } from "../../types";
import { CatalogToolbar } from "../ManagerCatalog/CatalogToolbar";
import { ProductCard } from "../ProductCard/ProductCard";
import { catalogHref } from "./catalog-href";
import styles from "./CatalogBrowser.module.css";

type Props = {
	filters: CatalogFilters;
	result: CatalogPage<CatalogProductDto>;
	selectable?: boolean;
	child?: boolean;
};

const BASE = "/shop/products";

// Same catalog panel as the manager area, without prices or manager-only data.
export function CatalogBrowser({ filters, result, selectable = false, child = false }: Props) {
	const hasFilters = Boolean(filters.q || filters.category);
	const hasPagination = Boolean(result.nextCursor || result.previousCursor || filters.cursor || filters.before);

	return (
		<div className={cx(styles.page, styles.requester)}>
			<header className={styles.header}>
				<div className={styles.heading}>
					<h1>{catalogCopy.requesterTitle}</h1>
					<p>{catalogCopy.requesterIntro}</p>
				</div>
				<ActionLink href="/shop" variant="secondary" size="lg">{catalogCopy.home}</ActionLink>
			</header>

			<CatalogToolbar action={BASE} filters={filters} audience="requester" />
			{selectable ? <DraftSummary /> : null}

			<div className={styles.resultsBar}>
				<div className={styles.summary}>
					<p role="status" className={styles.results}>{catalogCopy.results({ count: result.products.length })}</p>
					{filters.category ? (
						<span className={styles.filterChip}>
							<Icon icon={CATEGORY_ICONS[filters.category]} size={24} />
							{catalogCopy.categories[filters.category]}
						</span>
					) : null}
				</div>
				{hasFilters ? <ActionLink href={BASE} variant="secondary">{catalogCopy.clear}</ActionLink> : null}
			</div>

			{result.products.length ? (
				<ul className={styles.grid} aria-label={catalogCopy.requesterTitle}>
					{result.products.map((product) => <li key={product.sku}>
						{selectable ? <ProductSelection product={product}><ProductCard product={product} /></ProductSelection> : <ProductCard product={product} />}
					</li>)}
				</ul>
			) : (
				<div className={styles.empty}>
					<span className={styles.emptyIcon}><Icon icon={ShoppingBasket01Icon} size={32} /></span>
					<h2>{hasFilters ? catalogCopy.noMatches : catalogCopy.empty}</h2>
					<p>{hasFilters ? catalogCopy.noMatchesHelp : child ? requestsCopy.childEmpty : catalogCopy.emptyHelp}</p>
				</div>
			)}

			{hasPagination ? (
				<nav className={styles.pagination} aria-label={catalogCopy.pages}>
					{result.previousCursor ? (
						<ActionLink href={catalogHref(BASE, { ...filters, cursor: undefined, before: result.previousCursor })} variant="secondary" size="lg">{catalogCopy.previous}</ActionLink>
					) : filters.cursor || filters.before ? (
						<ActionLink href={catalogHref(BASE, { ...filters, cursor: undefined, before: undefined })} variant="secondary" size="lg">{catalogCopy.first}</ActionLink>
					) : null}
					{result.nextCursor ? <ActionLink href={catalogHref(BASE, { ...filters, before: undefined, cursor: result.nextCursor })} size="lg">{catalogCopy.more}</ActionLink> : null}
				</nav>
			) : null}

			<div className={styles.notice}>
				<Icon icon={InformationCircleIcon} size={24} />
				<p>{selectable ? requestsCopy.basketIntro : catalogCopy.readOnly}</p>
			</div>
		</div>
	);
}
