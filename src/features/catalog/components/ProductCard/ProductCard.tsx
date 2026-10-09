import Image from "next/image";
import { Icon } from "@/components/ui/Icon/Icon";
import { formatMoney } from "@/lib/format";
import { CATEGORY_ICONS } from "../../category-icons";
import { catalogCopy } from "../../copy";
import type { CatalogProductDto, ManagerProductDto } from "../../types";
import styles from "./ProductCard.module.css";

export function ProductCard({ product }: { product: CatalogProductDto | ManagerProductDto }) {
	const managerProduct = "demoPrice" in product ? product : null;
	return (
		<article className={styles.card} aria-labelledby={`product-${product.sku}`}>
			<div className={styles.picture}>
				{product.imagePath ? (
					<Image
						src={product.imagePath}
						alt={`${product.displayName}, ${product.sizeLabel}`}
						fill
						sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 33vw, 50vw"
						className={styles.image}
					/>
				) : <Icon icon={CATEGORY_ICONS[product.category]} size={64} />}
			</div>
			<h2 id={`product-${product.sku}`} className={styles.name}>{product.displayName}</h2>
			<p className={styles.size}>{product.sizeLabel}</p>
			{managerProduct ? (
				<>
					{managerProduct.brand ? <p>{managerProduct.brand}</p> : null}
					<p className={styles.price}>{catalogCopy.demoPrice}: {formatMoney(managerProduct.demoPrice.priceMinor, managerProduct.demoPrice.currency)}</p>
					<p className={styles.attribution}>{managerProduct.attribution}</p>
					{managerProduct.imageSourceUrl ? (
						<p className={styles.attribution}>
							{managerProduct.imageAttribution}. {" "}
							<a href={managerProduct.imageProductUrl ?? managerProduct.imageSourceUrl}>{catalogCopy.imageSource}</a>{" · "}
							<a href="https://creativecommons.org/licenses/by-sa/3.0/">{catalogCopy.imageLicense}</a>
						</p>
					) : null}
				</>
			) : null}
		</article>
	);
}
