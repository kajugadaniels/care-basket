import { Search01Icon, ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { DraftSummary } from "@/features/requests/components/DraftProvider/DraftSummary";
import { requestsCopy } from "@/features/requests/copy";
import { CATEGORY_ICONS } from "../../category-icons";
import { catalogCopy } from "../../copy";
import type { CatalogFilters, CatalogPage, CatalogProductDto } from "../../types";
import { CatalogToolbar } from "../ManagerCatalog/CatalogToolbar";
import { RequesterProductFeed } from "./RequesterProductFeed";
import { catalogHref } from "./catalog-href";
import styles from "./CatalogBrowser.module.css";

type Props = {
	filters: CatalogFilters;
	result: CatalogPage<CatalogProductDto>;
	selectable?: boolean;
	child?: boolean;
};

const BASE = "/shop/products";

// Browsing and the unsent list share a workspace without exposing manager-only data.
export function CatalogBrowser({ filters, result, selectable = false, child = false }: Props) {
	const hasFilters = Boolean(filters.q || filters.category);
	const hasPagination = Boolean(result.previousCursor || filters.cursor || filters.before);

	return (
		<div className={cx(styles.page, styles.requester)}>
			<header className={styles.header}>
				<div className={styles.heading}>
					<h1>{catalogCopy.requesterTitle}</h1>
					<p>{catalogCopy.requesterIntro}</p>
				</div>
			</header>

			<CatalogToolbar action={BASE} filters={filters} audience="requester" />

			{hasFilters ? (
				<div className={styles.resultsBar}>
					<ul className={styles.activeFilters} aria-label={catalogCopy.activeFilters}>
						{filters.q ? (
							<li className={styles.filterChip}>
								<Icon icon={Search01Icon} size={24} />
								{filters.q}
							</li>
						) : null}
						{filters.category ? (
							<li className={styles.filterChip}>
								<Icon icon={CATEGORY_ICONS[filters.category]} size={24} />
								{catalogCopy.categories[filters.category]}
							</li>
						) : null}
					</ul>
					<ActionLink href={BASE} variant="secondary">{catalogCopy.clear}</ActionLink>
				</div>
			) : null}

			<div className={cx(styles.workspace, selectable && styles.withList)}>
				{selectable ? (
					<aside className={styles.listPanel} aria-label={requestsCopy.detailTitle}>
						<DraftSummary />
					</aside>
				) : null}

				<div className={styles.catalogContent}>
					{result.products.length ? (
						<RequesterProductFeed key={catalogHref(BASE, filters)} filters={filters} initial={result} selectable={selectable} />
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
						</nav>
					) : null}
					{!selectable ? <p className={styles.readOnly}>{catalogCopy.readOnly}</p> : null}
				</div>
			</div>
		</div>
	);
}
