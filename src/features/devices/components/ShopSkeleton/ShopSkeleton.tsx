import { LoadingState } from "@/components/ui/LoadingState/LoadingState";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { cx } from "@/lib/class-names";
import { devicesCopy } from "../../copy";
import styles from "./ShopSkeleton.module.css";

type Props = { variant?: "home" | "assistant" | "basket" | "history" | "detail" };

export function ShopSkeleton({ variant = "home" }: Props) {
	const reading = variant === "assistant" || variant === "history" || variant === "detail";

	return (
		<LoadingState label={devicesCopy.loadingShopping} className={cx(styles.page, reading && styles.reading)}>
			<div className={styles.heading} aria-hidden="true"><Skeleton shape="heading" /><Skeleton /></div>
			{variant === "home" ? (
				<div className={styles.home} aria-hidden="true">
					<div className={styles.panel}><Skeleton shape="heading" /><Skeleton /><Skeleton shape="pill" /></div>
					<div className={styles.panel}><Skeleton /><Skeleton shape="pill" /><Skeleton shape="pill" /></div>
				</div>
			) : variant === "assistant" ? (
				<div className={styles.panel} aria-hidden="true">
					<div className={styles.actions}><Skeleton shape="pill" /><Skeleton shape="pill" /></div>
					<Skeleton shape="box" className={styles.textarea} /><Skeleton shape="pill" />
				</div>
			) : (
				<div className={cx(styles.rows, variant === "basket" && styles.basket)} aria-hidden="true">
					<div className={styles.rows}>
						{[0, 1, 2].map((key) => <div key={key} className={styles.row}>
							{variant !== "history" ? <Skeleton shape="box" className={styles.picture} /> : null}
							<div className={styles.lines}><Skeleton shape="heading" /><Skeleton /><Skeleton shape="pill" /></div>
						</div>)}
					</div>
					{variant === "basket" ? <div className={styles.panel}><Skeleton shape="heading" /><Skeleton /><Skeleton shape="pill" /></div> : null}
				</div>
			)}
		</LoadingState>
	);
}
