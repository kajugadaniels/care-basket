"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button/Button";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { cx } from "@/lib/class-names";
import { requestsCopy } from "../../copy";
import styles from "./RequestUi.module.css";

export function RequestError({ retry, requester = false, title = requestsCopy.errorTitle }: {
	retry: () => void; requester?: boolean; title?: string;
}) {
	const heading = useRef<HTMLHeadingElement>(null);
	useEffect(() => { heading.current?.focus(); }, []);

	return <section className={cx(styles.page, styles.panel, requester && styles.reading, requester && styles.requester)}>
		<h1 ref={heading} tabIndex={-1}>{title}</h1>
		<p role="alert">{requestsCopy.errorHelp}</p>
		<div className={styles.actions}>
			<Button onClick={retry} size={requester ? "lg" : "md"}>{requestsCopy.retry}</Button>
			{requester ? <ActionLink href="/shop/products" size="lg" variant="secondary">{requestsCopy.browse}</ActionLink> : null}
		</div>
	</section>;
}
