import Image from "next/image";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { formatMoney } from "@/lib/format";
import { CATEGORY_ICONS } from "../../category-icons";
import { catalogCopy } from "../../copy";
import type { CatalogProductDto, ManagerProductDto } from "../../types";
import styles from "./ProductCard.module.css";

// Requesters see the picture, name, and size only. Managers also see the category, brand,
// demo price, and the data and image attribution that the licenses require.
export function ProductCard({ product, idPrefix = "product" }: { product: CatalogProductDto | ManagerProductDto; idPrefix?: string }) {
	const managerProduct = "demoPrice" in product ? product : null;
	const headingId = `${idPrefix}-${product.sku}`;

	return (
		<article className={cx(styles.card, managerProduct && styles.managerCard)} aria-labelledby={headingId}>
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
				{managerProduct ? (
					<p className={styles.category}>
						<Icon icon={CATEGORY_ICONS[product.category]} size={20} />
						{catalogCopy.categories[product.category]}
					</p>
				) : null}
				<h2 id={headingId} className={styles.name}>
					{product.displayName}
				</h2>
				<p className={styles.meta}>
					{managerProduct?.brand ? <span>{managerProduct.brand}</span> : null}
					<span>{product.sizeLabel}</span>
				</p>
				{managerProduct ? (
					<>
						<p className={styles.price}>
							<span className={styles.priceLabel}>{catalogCopy.demoPrice}</span>
							<span className={styles.priceValue}>
								{formatMoney(managerProduct.demoPrice.priceMinor, managerProduct.demoPrice.currency)}
							</span>
						</p>
						<div className={styles.attribution}>
							<p>{managerProduct.attribution}</p>
							{managerProduct.imageSourceUrl ? (
								<p>
									{managerProduct.imageAttribution}.{" "}
									<a href={managerProduct.imageProductUrl ?? managerProduct.imageSourceUrl}>{catalogCopy.imageSource}</a>
									{" · "}
									<a href="https://creativecommons.org/licenses/by-sa/3.0/">{catalogCopy.imageLicense}</a>
								</p>
							) : null}
						</div>
					</>
				) : null}
			</div>
		</article>
	);
}
