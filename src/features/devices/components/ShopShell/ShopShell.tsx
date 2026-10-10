import type { ReactNode } from "react";
import { Home01Icon, ShoppingBasket01Icon, Task01Icon } from "@hugeicons/core-free-icons";
import { Brand } from "@/components/layout/Brand/Brand";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { devicesCopy } from "../../copy";
import styles from "./ShopShell.module.css";

// Static chrome stays available while the device and page content stream in.
// Every page still checks its own device permission; the shell exposes no profile data.
export function ShopShell({ children }: { children: ReactNode }) {
	return (
		<div className={styles.shell}>
			<a href="#shop-main" className={styles.skip}>{devicesCopy.skipShopping}</a>
			<header className={styles.header}>
				<div className={styles.headerInner}>
					<div className={styles.identity}><Brand href="/shop/assistant" /></div>
					<div className={styles.tools}>
						<nav aria-label={devicesCopy.shopNav} className={styles.navigation}>
							<ActionLink href="/shop/assistant" variant="secondary" icon={Home01Icon}>{devicesCopy.shopHome}</ActionLink>
							<ActionLink href="/shop/products" variant="secondary" icon={ShoppingBasket01Icon}>{devicesCopy.shopProducts}</ActionLink>
							<ActionLink href="/shop/basket" variant="secondary" icon={Task01Icon}>{devicesCopy.shopList}</ActionLink>
						</nav>
					</div>
				</div>
			</header>
			<main id="shop-main" tabIndex={-1} className={styles.main}>{children}</main>
			<footer className={styles.footer}>
				<p>{devicesCopy.shopDemo}</p>
				<p>{devicesCopy.disclaimer}</p>
			</footer>
		</div>
	);
}
