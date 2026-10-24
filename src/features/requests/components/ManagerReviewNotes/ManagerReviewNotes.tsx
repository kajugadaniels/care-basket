import { formatMoney } from "@/lib/format";
import { requestsCopy as copy } from "../../copy";
import { summarizeManagerReview, type ManagerReviewSummary } from "../../manager-review";
import type { ManagerDetailDto } from "../../types";
import styles from "./ManagerReviewNotes.module.css";

function describeBudget(budget: ManagerReviewSummary["budget"], currency: string) {
	if (!budget) return null;
	if (budget.status === "MATCHES") return copy.managerBudgetMatches;

	const amount = formatMoney(budget.differenceMinor, currency);
	return budget.status === "ABOVE"
		? copy.managerBudgetAbove(amount)
		: copy.managerBudgetBelow(amount);
}

export function ManagerReviewNotes({ request }: { request: ManagerDetailDto }) {
	if (!request.items.length) return null;

	const summary = summarizeManagerReview(request);
	const budgetText = describeBudget(summary.budget, request.currency);

	return (
		<section className={styles.notes} aria-label={copy.managerReviewNotes}>
			<h3>{copy.managerReviewNotes}</h3>
			<ul>
				<li>{copy.managerOriginSummary({
					requested: summary.requestedCount,
					suggested: summary.suggestedCount,
				})}</li>
				{summary.substituteCount ? (
					<li className={styles.attention}>{copy.managerSubstituteSummary(summary.substituteCount)}</li>
				) : null}
				{budgetText ? (
					<li className={summary.budget?.status === "ABOVE" ? styles.attention : undefined}>
						{budgetText}
					</li>
				) : null}
			</ul>
		</section>
	);
}
