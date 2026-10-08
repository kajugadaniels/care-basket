"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconSvgElement } from "@hugeicons/react";
import { Home01Icon, UserGroupIcon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { familyLayoutCopy } from "@/features/family/copy";
import { cx } from "@/lib/class-names";
import styles from "./FamilyNav.module.css";

type NavItem = { href: string; label: string; icon: IconSvgElement };

// Only implemented routes appear here. Nested profile routes share the members active state.
const NAV_ITEMS: readonly NavItem[] = [
  { href: "/family", label: familyLayoutCopy.nav.overview, icon: Home01Icon },
  { href: "/family/members", label: familyLayoutCopy.nav.members, icon: UserGroupIcon },
  { href: "/family/devices", label: familyLayoutCopy.nav.devices, icon: SmartPhone01Icon },
];

function isCurrentPage(pathname: string, href: string) {
  if (href === "/family") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

// A client component only because it needs the current path for aria-current.
export function FamilyNav() {
  const pathname = usePathname();

  return (
    <nav aria-label={familyLayoutCopy.navLabel} className={styles.nav}>
      <ul role="list" className={styles.list}>
        {NAV_ITEMS.map((item) => {
          const isCurrent = isCurrentPage(pathname, item.href);
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
