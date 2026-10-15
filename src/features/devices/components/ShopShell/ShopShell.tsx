import type { ReactNode } from "react";
import { Brand } from "@/components/layout/Brand/Brand";
import { devicesCopy } from "../../copy";
import { ShopNavigation } from "../ShopNavigation/ShopNavigation";
import styles from "./ShopShell.module.css";

// Static chrome stays available while the device and page content stream in.
// Every page still checks its own device permission; the shell exposes no profile data.
export function ShopShell({ children }: { children: ReactNode }) {
	return (
		<div className={styles.shell}>
			<a href="#shop-main" className={styles.skip}>{devicesCopy.skipShopping}</a>
			<header className={styles.header}>
				<div className={styles.headerInner}>
					<div className={styles.identity}><Brand href="/shop/assistant" iconOnly /></div>
					<ShopNavigation />
				</div>
			</header>
			<main id="shop-main" tabIndex={-1} className={styles.main}>{children}</main>
		</div>
	);
}
