"use client";

import { useEffect, useRef } from "react";
import { ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { assistantCopy as copy } from "../../copy";
import { useAssistant } from "../AssistantProvider/AssistantProvider";
import { ProposalReview } from "./ProposalReview";
import styles from "./ProposalReview.module.css";

export function ProposalReviewScreen() {
	const { proposal, revision } = useAssistant();
	const headingRef = useRef<HTMLHeadingElement>(null);

	useEffect(() => { headingRef.current?.focus(); }, [revision]);

	if (!proposal) {
		return (
			<div className={styles.screen}>
				<section className={styles.empty} aria-labelledby="empty-review-title" aria-describedby="empty-review-help">
					<div className={styles.emptyIcon} aria-hidden="true">
						<Icon icon={ShoppingBasket01Icon} size={64} />
					</div>
					<div className={styles.emptyMessage}>
						<h1 id="empty-review-title" ref={headingRef} tabIndex={-1}>{copy.emptyReview}</h1>
						<p id="empty-review-help">{copy.emptyReviewHelp}</p>
					</div>
					<div className={styles.emptyActions}>
						<ActionLink href="/shop/assistant" size="lg">{copy.startAgain}</ActionLink>
						<ActionLink href="/shop/products" size="lg" variant="secondary">{copy.browseProducts}</ActionLink>
					</div>
				</section>
			</div>
		);
	}

	return (
		<div className={styles.screen}>
			<header className={styles.heading}>
				<div className={styles.headerRow}>
					<h1 ref={headingRef} tabIndex={-1}>{copy.review}</h1>
					<div className={styles.headerActions}>
						<ActionLink href="/shop/assistant" variant="secondary">{copy.backToAssistant}</ActionLink>
						<ActionLink href="/shop/products" variant="secondary">{copy.none}</ActionLink>
					</div>
				</div>
				<p>{copy.reviewIntro}</p>
			</header>
			<ProposalReview key={revision} proposal={proposal} />
		</div>
	);
}
