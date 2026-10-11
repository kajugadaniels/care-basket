"use client";

import { LoadMore } from "@/components/ui/LoadMore/LoadMore";
import { usePagedList } from "@/components/ui/LoadMore/use-paged-list";
import { ProductSelection } from "@/features/requests/components/DraftProvider/ProductSelection";
import { loadRequesterProductsAction } from "../../actions";
import { catalogCopy } from "../../copy";
import type { CatalogFilters, CatalogPage, CatalogProductDto } from "../../types";
import { ProductCard } from "../ProductCard/ProductCard";
import styles from "./CatalogBrowser.module.css";

export function RequesterProductFeed({ filters, initial, selectable }: {
	filters: CatalogFilters; initial: CatalogPage<CatalogProductDto>; selectable: boolean;
}) {
	const feed = usePagedList({ items: initial.products, nextCursor: initial.nextCursor }, (cursor) =>
		loadRequesterProductsAction({ q: filters.q, category: filters.category, cursor }));
	return <>
		<p role="status" aria-live="polite" aria-atomic="true" className={styles.results}>
			{catalogCopy.results({ count: feed.items.length })}
		</p>
		<ul className={styles.grid} aria-label={catalogCopy.requesterTitle}>
			{feed.items.map((product) => <li key={product.sku}>
				{selectable ? <ProductSelection product={product}><ProductCard product={product} /></ProductSelection> : <ProductCard product={product} />}
			</li>)}
		</ul>
		<LoadMore {...feed} onLoad={feed.loadMore} labels={catalogCopy.feed} />
	</>;
}
