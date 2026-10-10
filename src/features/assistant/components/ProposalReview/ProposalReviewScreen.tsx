"use client";

import { useEffect, useRef } from "react";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { assistantCopy as copy } from "../../copy";
import { useAssistant } from "../AssistantProvider/AssistantProvider";
import { ProposalReview } from "./ProposalReview";
import styles from "./ProposalReview.module.css";

export function ProposalReviewScreen() {
	const { proposal, revision, setProposal } = useAssistant();
	const headingRef = useRef<HTMLHeadingElement>(null);

	useEffect(() => { headingRef.current?.focus(); }, [revision]);

	return (
		<div className={styles.screen}>
			<header className={styles.heading}>
				<div className={styles.headerRow}>
					<h1 ref={headingRef} tabIndex={-1}>{proposal ? copy.review : copy.emptyReview}</h1>
					<div className={styles.headerActions}>
						<ActionLink href="/shop/assistant" variant="secondary">{copy.backToAssistant}</ActionLink>
						{proposal ? (
							<ActionLink href="/shop/products" variant="secondary">{copy.none}</ActionLink>
						) : null}
					</div>
				</div>
				<p>{proposal ? copy.reviewIntro : copy.emptyReviewHelp}</p>
			</header>
			{proposal ? (
				<ProposalReview
					key={revision}
					proposal={proposal}
					onAccepted={() => setProposal(null)}
				/>
			) : (
				<section className={styles.empty} aria-label={copy.emptyReview}>
					<ActionLink href="/shop/assistant" size="lg">{copy.startAgain}</ActionLink>
					<ActionLink href="/shop/products" size="lg" variant="secondary">{copy.pictures}</ActionLink>
				</section>
			)}
		</div>
	);
}
