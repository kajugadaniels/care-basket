import type { ReactNode } from "react";
import { Home01Icon, InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Brand } from "@/components/layout/Brand/Brand";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
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
					<div className={styles.identity}><Brand /></div>
					<div className={styles.tools}>
						<ActionLink href="/shop" variant="secondary" icon={Home01Icon}>{devicesCopy.shopHome}</ActionLink>
						<details className={styles.help}>
							<summary><Icon icon={InformationCircleIcon} size={24} />{devicesCopy.askFamily}</summary>
							<p>{devicesCopy.shopHelp}</p>
						</details>
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
