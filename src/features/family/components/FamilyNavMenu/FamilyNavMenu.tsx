import Link from "next/link";
import type { IconSvgElement } from "@hugeicons/react";
import { Home01Icon, SmartPhone01Icon, UserGroupIcon, ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { familyLayoutCopy } from "@/features/family/copy";
import { cx } from "@/lib/class-names";
import styles from "./FamilyNavMenu.module.css";

type NavItem = { href: string; label: string; icon: IconSvgElement };

// Only implemented routes appear here. Nested profile routes share the members active state.
const NAV_ITEMS: readonly NavItem[] = [
	{ href: "/family", label: familyLayoutCopy.nav.overview, icon: Home01Icon },
	{ href: "/family/members", label: familyLayoutCopy.nav.members, icon: UserGroupIcon },
	{ href: "/family/devices", label: familyLayoutCopy.nav.devices, icon: SmartPhone01Icon },
	{ href: "/family/catalog", label: familyLayoutCopy.nav.catalog, icon: ShoppingBasket01Icon },
];

function isCurrentPage(pathname: string, href: string) {
	if (href === "/family") {
		return pathname === href;
	}
	return pathname === href || pathname.startsWith(`${href}/`);
}

// Without a pathname it renders every link unmarked: the static fallback shown
// while the current path is still unknown, so the navigation never shifts in.
export function FamilyNavMenu({ pathname }: { pathname?: string }) {
	return (
		<nav aria-label={familyLayoutCopy.navLabel} className={styles.nav}>
			<ul role="list" className={styles.list}>
				{NAV_ITEMS.map((item) => {
					const isCurrent = pathname !== undefined && isCurrentPage(pathname, item.href);
					return (
						<li key={item.href}>
							<Link
								href={item.href}
								aria-current={isCurrent ? "page" : undefined}
								className={cx(styles.link, isCurrent && styles.current)}
							>
								<Icon icon={item.icon} size={24} />
								<span>{item.label}</span>
							</Link>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
