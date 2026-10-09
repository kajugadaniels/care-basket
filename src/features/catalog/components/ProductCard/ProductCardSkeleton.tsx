import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cx } from "@/lib/class-names";
import styles from "./ProductCard.module.css";

// Same card, picture tile, and rows as a manager ProductCard, with every value a placeholder.
export function ProductCardSkeleton() {
	return (
		<div className={cx(styles.card, styles.managerCard)}>
			<Skeleton shape="box" className={styles.pictureSkeleton} />
			<div className={styles.body}>
				<Skeleton shape="box" className={styles.categorySkeleton} />
				<Skeleton shape="heading" className={cx(styles.name, styles.nameSkeleton)} />
				<Skeleton className={cx(styles.meta, styles.metaSkeleton)} />
				<div className={styles.price}>
					<Skeleton shape="box" className={styles.priceLabelSkeleton} />
					<Skeleton shape="heading" className={cx(styles.priceValue, styles.priceValueSkeleton)} />
				</div>
				<div className={styles.attribution}>
					<Skeleton className={styles.attributionSkeleton} />
					<Skeleton className={styles.attributionSkeletonShort} />
				</div>
			</div>
		</div>
	);
}
