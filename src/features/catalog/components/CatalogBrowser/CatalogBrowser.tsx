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
import type { CatalogFilters, CatalogPage, CatalogProductDto, ManagerProductDto } from "../../types";
import { ProductCard } from "../ProductCard/ProductCard";
import { catalogHref } from "./catalog-href";
import styles from "./CatalogBrowser.module.css";

type Props = {
	view: "requester" | "manager";
	filters: CatalogFilters;
	result: CatalogPage<CatalogProductDto | ManagerProductDto>;
};

export function CatalogBrowser({ view, filters, result }: Props) {
	const requester = view === "requester";
	const base = requester ? "/shop/products" : "/family/catalog";
	const hasFilters = Boolean(filters.q || filters.category || filters.cursor);
	return (
		<div className={cx(styles.page, requester && styles.requester)}>
			<header className={styles.header}>
				<h1>{requester ? catalogCopy.requesterTitle : catalogCopy.managerTitle}</h1>
				<p>{requester ? catalogCopy.requesterIntro : catalogCopy.managerIntro}</p>
				<ActionLink href={requester ? "/shop" : "/family"} variant="secondary">{requester ? catalogCopy.home : catalogCopy.familyHome}</ActionLink>
			</header>
			<div className={styles.filters}>
				<Form action={base} key={`${filters.category}-${filters.q}`} prefetch={false}>
					<div className={styles.field}>
						<label htmlFor="catalog-search">{catalogCopy.searchLabel}</label>
						<input id="catalog-search" type="search" name="q" defaultValue={filters.q} maxLength={80} />
					</div>
					{filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
					<div className={styles.actions}>
						<Button type="submit" size={requester ? "lg" : "md"}>{catalogCopy.search}</Button>
						{hasFilters ? <ActionLink href={base} variant="secondary">{catalogCopy.clear}</ActionLink> : null}
					</div>
				</Form>
				<details className={styles.categoryPicker}>
					<summary>{catalogCopy.categoryLabel}: {filters.category ? catalogCopy.categories[filters.category] : catalogCopy.all}</summary>
					<nav aria-label={catalogCopy.categoryLabel}>
						<ul className={styles.categories}>
							<li><Link href={catalogHref(base, { q: filters.q })} className={styles.category} aria-current={!filters.category ? "page" : undefined} prefetch={false}><Icon icon={ShoppingBasket01Icon} size={32} />{catalogCopy.all}</Link></li>
							{PRODUCT_CATEGORIES.map((category) => (
								<li key={category}>
									<Link href={catalogHref(base, { category, q: filters.q })} className={styles.category} aria-current={category === filters.category ? "page" : undefined} prefetch={false}>
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
				<ul className={styles.grid} aria-label={requester ? catalogCopy.requesterTitle : catalogCopy.managerTitle}>
					{result.products.map((product) => <li key={product.sku}><ProductCard product={product} /></li>)}
				</ul>
			) : (
				<div className={styles.empty}>
					<p>{hasFilters ? catalogCopy.noMatches : catalogCopy.empty}</p>
					<p>{hasFilters ? catalogCopy.noMatchesHelp : requester ? catalogCopy.emptyHelp : catalogCopy.managerEmpty}</p>
				</div>
			)}
			<nav className={styles.actions} aria-label={catalogCopy.more}>
				{result.nextCursor ? <ActionLink href={catalogHref(base, { ...filters, cursor: result.nextCursor })}>{catalogCopy.more}</ActionLink> : null}
				{filters.cursor ? <ActionLink href={catalogHref(base, { ...filters, cursor: undefined })} variant="secondary">{catalogCopy.first}</ActionLink> : null}
			</nav>
			<p className={styles.notice}>{requester ? catalogCopy.readOnly : catalogCopy.simulation}</p>
			{!requester ? <Link href="/data-sources">{catalogCopy.dataSources}</Link> : null}
		</div>
	);
}
