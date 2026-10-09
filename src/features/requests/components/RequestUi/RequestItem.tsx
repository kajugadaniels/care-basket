import Image from "next/image";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { CATEGORY_ICONS } from "@/features/catalog/category-icons";
import type { CatalogProductDto } from "@/features/catalog/types";
import styles from "./RequestUi.module.css";

export function RequestItem({ product, children }: { product: CatalogProductDto; children: ReactNode }) {
	return <div className={styles.item}>
		<div className={styles.picture}>
			{product.imagePath ? <Image src={product.imagePath} alt={`${product.displayName}, ${product.sizeLabel}`}
				fill sizes="192px" /> : <Icon icon={CATEGORY_ICONS[product.category]} size={64} />}
		</div>
		<div className={styles.body}>
			<h2>{product.displayName}</h2><p className={styles.muted}>{product.sizeLabel}</p>
			{children}
		</div>
	</div>;
}
