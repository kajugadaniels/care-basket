import { CancelCircleIcon, CheckmarkCircle02Icon, Clock01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { formatDate, formatTime } from "@/lib/format";
import { checkoutCopy } from "@/features/checkout/copy";
import type { CheckoutDto } from "@/features/checkout/types";
import { requestsCopy as copy } from "../../copy";
import type { ManagerDetailDto } from "../../types";
import { ManagerBasket } from "../ManagerBasket/ManagerBasket";
import { CloseRequestDialog } from "../RequestUi/CloseRequestDialog";
import styles from "./ManagerRequestDetail.module.css";

export function ManagerRequestDetail({ request, checkout }: { request: ManagerDetailDto; checkout?: CheckoutDto | null }) {
	const isPending = request.status === "PENDING_REVIEW";
	const adjusted = checkout?.state === "REFUNDED" || checkout?.state === "REVERSED";
	const isPaid = request.status === "PAID" && !adjusted;
	const isClosed = request.status === "DECLINED" || request.status === "CANCELLED";
	const statusIcon = isPaid ? CheckmarkCircle02Icon : isClosed ? CancelCircleIcon : Clock01Icon;

	return (
		<div className={styles.page}>
			<PageHeader
				title={copy.managerTitle(request.displayName)}
				description={copy.managerDetailIntro}
				actions={<ActionLink href="/family/requests" variant="secondary">{copy.back}</ActionLink>}
			/>

			<section className={styles.overview} aria-label={adjusted ? copy.paymentUpdated : copy.statuses[request.status]}>
				<div className={styles.overviewHeader}>
					<div className={styles.member}>
						<span className={styles.avatar}><Icon icon={UserIcon} size={24} /></span>
						<div className={styles.memberDetails}>
							<p className={styles.name}>{request.displayName}</p>
							<time dateTime={request.submittedAt} className={styles.metadata}>
								{formatDate(request.submittedAt)}
								<span>{copy.submittedTime({ time: formatTime(request.submittedAt) })}</span>
							</time>
						</div>
					</div>
					<p className={cx(styles.status, isPending && styles.pending, isPaid && styles.paid, isClosed && styles.closed)}>
						<Icon icon={statusIcon} size={20} />
						{adjusted ? copy.paymentUpdated : copy.statuses[request.status]}
					</p>
				</div>
				<p className={styles.explanation}>{adjusted ? copy.paymentAdjusted : copy.managerExplanations[request.status]}</p>
			</section>

			{request.inputText ? (
				<section className={styles.original} aria-labelledby="original-request-title">
					<h2 id="original-request-title">{copy.original}</h2>
					<blockquote>{request.inputText}</blockquote>
				</section>
			) : null}

			<ManagerBasket request={request}>
				{request.editable ? (
					<CloseRequestDialog requestId={request.id} revision={request.revision} manager />
				) : <p className={styles.explanation}>{copy.locked}</p>}
				{!isClosed && (request.editable || request.status === "AWAITING_PAYMENT" || checkout) ? (
					<ActionLink href={`/family/requests/${request.id}/checkout`}>
						{request.status === "PAID" ? checkoutCopy.viewPayment : checkoutCopy.checkout}
					</ActionLink>
				) : null}
			</ManagerBasket>
		</div>
	);
}
