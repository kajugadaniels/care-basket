import Form from "next/form";
import Link from "next/link";
import { ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { CATEGORY_ICONS } from "../../category-icons";
import { catalogCopy } from "../../copy";
import { PRODUCT_CATEGORIES } from "../../taxonomy";
import type { CatalogFilters, CatalogPage, CatalogProductDto } from "../../types";
import { ProductCard } from "../ProductCard/ProductCard";
import { catalogHref } from "./catalog-href";
import styles from "./CatalogBrowser.module.css";

type Props = {
	filters: CatalogFilters;
	result: CatalogPage<CatalogProductDto>;
};

const BASE = "/shop/products";

// The requester's picture-first grocery browser. Managers use ManagerCatalog instead.
export function CatalogBrowser({ filters, result }: Props) {
	const hasFilters = Boolean(filters.q || filters.category || filters.cursor);
	return (
		<div className={cx(styles.page, styles.requester)}>
			<header className={styles.header}>
				<h1>{catalogCopy.requesterTitle}</h1>
				<p>{catalogCopy.requesterIntro}</p>
				<ActionLink href="/shop" variant="secondary">{catalogCopy.home}</ActionLink>
			</header>
			<div className={styles.filters}>
				<Form action={BASE} key={`${filters.category}-${filters.q}`} prefetch={false}>
					<div className={styles.field}>
						<label htmlFor="catalog-search">{catalogCopy.searchLabel}</label>
						<input id="catalog-search" type="search" name="q" defaultValue={filters.q} maxLength={80} />
					</div>
					{filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
					<div className={styles.actions}>
						<Button type="submit" size="lg">{catalogCopy.search}</Button>
						{hasFilters ? <ActionLink href={BASE} variant="secondary">{catalogCopy.clear}</ActionLink> : null}
					</div>
				</Form>
				<details className={styles.categoryPicker}>
					<summary>{catalogCopy.categoryLabel}: {filters.category ? catalogCopy.categories[filters.category] : catalogCopy.all}</summary>
					<nav aria-label={catalogCopy.categoryLabel}>
						<ul className={styles.categories}>
							<li><Link href={catalogHref(BASE, { q: filters.q })} className={styles.category} aria-current={!filters.category ? "page" : undefined} prefetch={false}><Icon icon={ShoppingBasket01Icon} size={32} />{catalogCopy.all}</Link></li>
							{PRODUCT_CATEGORIES.map((category) => (
								<li key={category}>
									<Link href={catalogHref(BASE, { category, q: filters.q })} className={styles.category} aria-current={category === filters.category ? "page" : undefined} prefetch={false}>
										<Icon icon={CATEGORY_ICONS[category]} size={32} />{catalogCopy.categories[category]}
									</Link>
								</li>
							))}
						</ul>
					</nav>
				</details>
			</div>
			<p role="status">{catalogCopy.results({ count: result.products.length })}</p>
			{result.products.length ? (
				<ul className={styles.grid} aria-label={catalogCopy.requesterTitle}>
					{result.products.map((product) => <li key={product.sku}><ProductCard product={product} /></li>)}
				</ul>
			) : (
				<div className={styles.empty}>
					<p>{hasFilters ? catalogCopy.noMatches : catalogCopy.empty}</p>
					<p>{hasFilters ? catalogCopy.noMatchesHelp : catalogCopy.emptyHelp}</p>
				</div>
			)}
			<nav className={styles.actions} aria-label={catalogCopy.more}>
				{result.nextCursor ? <ActionLink href={catalogHref(BASE, { ...filters, cursor: result.nextCursor })}>{catalogCopy.more}</ActionLink> : null}
				{filters.cursor ? <ActionLink href={catalogHref(BASE, { ...filters, cursor: undefined })} variant="secondary">{catalogCopy.first}</ActionLink> : null}
			</nav>
			<p className={styles.notice}>{catalogCopy.readOnly}</p>
		</div>
	);
}
