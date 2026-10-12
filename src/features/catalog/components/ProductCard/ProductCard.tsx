import Image from "next/image";
import { Icon } from "@/components/ui/Icon/Icon";
import { CATEGORY_ICONS } from "../../category-icons";
import type { CatalogProductDto } from "../../types";
import styles from "./ProductCard.module.css";

// Requesters see the picture, name, and size only; prices stay in request review.
export function ProductCard({ product, idPrefix = "product" }: { product: CatalogProductDto; idPrefix?: string }) {
	const headingId = `${idPrefix}-${product.sku}`;

	return (
		<article className={styles.card} aria-labelledby={headingId}>
			<div className={styles.picture}>
				{product.imagePath ? (
					<Image
						src={product.imagePath}
						alt={`${product.displayName}, ${product.sizeLabel}`}
						fill
						sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 33vw, 50vw"
						className={styles.image}
					/>
				) : (
					<Icon icon={CATEGORY_ICONS[product.category]} size={64} />
				)}
			</div>
			<div className={styles.body}>
				<h2 id={headingId} className={styles.name}>
					{product.displayName}
				</h2>
				<p className={styles.meta}>
					<span>{product.sizeLabel}</span>
				</p>
			</div>
		</article>
	);
}
