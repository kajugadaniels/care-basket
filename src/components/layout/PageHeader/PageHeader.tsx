import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
	title: string;
	description?: string;
	// An icon-only link beside the title; its label is the accessible name.
	back?: { href: string; label: string };
	actions?: ReactNode;
};

// The page title row. It takes only static text, so it renders in the prerendered shell
// while the page's data streams in below it.
export function PageHeader({ title, description, back, actions }: PageHeaderProps) {
	const hasActions = Boolean(actions);

	return (
		<header className={cx(styles.header, hasActions && styles.withActions)}>
			<div className={cx(styles.heading, back && styles.withBack)}>
				{back ? (
					<Link href={back.href} className={styles.back}>
						<Icon icon={ArrowLeft01Icon} size={24} />
						<span className={styles.visuallyHidden}>{back.label}</span>
					</Link>
				) : null}
				<h1 className={styles.title}>{title}</h1>
				{description ? <p className={styles.description}>{description}</p> : null}
			</div>
			{hasActions ? <div className={styles.actions}>{actions}</div> : null}
		</header>
	);
}
