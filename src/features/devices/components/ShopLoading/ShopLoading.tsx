import { Spinner } from "@/components/ui/Spinner/Spinner";
import { devicesCopy } from "../../copy";
import styles from "./ShopLoading.module.css";

export function ShopLoading({ label = devicesCopy.loadingShopping }: { label?: string }) {
	return (
		<div className={styles.loading} role="status" aria-live="polite" aria-atomic="true">
			<Spinner className={styles.spinner} />
			<div className={styles.message}>
				<p className={styles.label}>{label}</p>
				<p className={styles.help}>{devicesCopy.loadingShoppingHelp}</p>
			</div>
		</div>
	);
}
