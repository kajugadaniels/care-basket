"use client";

import { useEffect, useRef } from "react";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { cx } from "@/lib/class-names";
import { catalogCopy } from "../../copy";
import styles from "./CatalogBrowser.module.css";

export function CatalogError({ retry, requester = false }: { retry: () => void; requester?: boolean }) {
	const heading = useRef<HTMLHeadingElement>(null);
	useEffect(() => { heading.current?.focus(); }, []);
	return (
		<div className={cx(styles.page, requester && styles.requester)} role="alert">
			<h1 ref={heading} tabIndex={-1}>{catalogCopy.errorTitle}</h1>
			<p>{catalogCopy.errorHelp}</p>
			<div className={styles.actions}>
				<Button onClick={retry} size={requester ? "lg" : "md"}>{catalogCopy.retry}</Button>
				<ActionLink href={requester ? "/shop" : "/family"} variant="secondary">{requester ? catalogCopy.home : catalogCopy.familyHome}</ActionLink>
			</div>
		</div>
	);
}
