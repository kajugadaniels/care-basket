"use client";

import { useEffect, useRef } from "react";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Button } from "@/components/ui/Button/Button";
import { catalogCopy } from "../../copy";
import styles from "./CatalogBrowser.module.css";

export function CatalogError({ retry }: { retry: () => void }) {
	const heading = useRef<HTMLHeadingElement>(null);
	useEffect(() => { heading.current?.focus(); }, []);
	return (
		<div className={`${styles.page} ${styles.requester}`} role="alert">
			<h1 ref={heading} tabIndex={-1}>{catalogCopy.errorTitle}</h1>
			<p>{catalogCopy.errorHelp}</p>
			<div className={styles.actions}>
				<Button onClick={retry} size="lg">{catalogCopy.retry}</Button>
				<ActionLink href="/shop" variant="secondary">{catalogCopy.home}</ActionLink>
			</div>
		</div>
	);
}
