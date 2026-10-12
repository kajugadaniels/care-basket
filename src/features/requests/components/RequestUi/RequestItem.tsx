import Image from "next/image";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { CATEGORY_ICONS } from "@/features/catalog/category-icons";
import type { CatalogProductDto } from "@/features/catalog/types";
import { cx } from "@/lib/class-names";
import styles from "./RequestUi.module.css";

export function RequestItem({ product, children, variant = "requester", className, headingLevel }: {
	product: CatalogProductDto;
	children: ReactNode;
	variant?: "requester" | "manager";
	className?: string;
	headingLevel?: 2 | 3;
}) {
	const isManager = variant === "manager";
	const Heading = (headingLevel ?? (isManager ? 3 : 2)) === 3 ? "h3" : "h2";
	return <div className={cx(styles.item, isManager && styles.managerItem, className)}>
		<div className={styles.picture}>
			{product.imagePath ? <Image src={product.imagePath} alt={`${product.displayName}, ${product.sizeLabel}`}
				fill sizes={isManager ? "96px" : "192px"} /> : <Icon icon={CATEGORY_ICONS[product.category]} size={isManager ? 32 : 64} />}
		</div>
		<div className={styles.body}>
			<Heading>{product.displayName}</Heading>
			<p className={styles.muted}>{product.sizeLabel}</p>
			{children}
		</div>
	</div>;
}
