"use client";

import { Cancel01Icon, CheckmarkCircle02Icon, Notification01Icon, ShoppingBasket01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Icon } from "@/components/ui/Icon/Icon";
import { formatDate, formatTime } from "@/lib/format";
import { requestNotificationsCopy as copy } from "../../copy";
import { useRequestNotifications } from "../../hooks/use-request-notifications";
import type { RequestNotificationsDto } from "../../types";
import styles from "./RequestNotifications.module.css";

export function RequestNotifications({ initialData }: { initialData: RequestNotificationsDto | null }) {
	const id = useId();
	const root = useRef<HTMLDivElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const [open, setOpen] = useState(false);
	const { data, failed, pending, accessLost, announcement, refresh } = useRequestNotifications(initialData);

	useEffect(() => {
		if (!open) return;
		function dismiss(event: PointerEvent) {
			if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
		}
		function dismissWithEscape(event: KeyboardEvent) {
			if (event.key !== "Escape") return;
			event.preventDefault();
			setOpen(false);
			trigger.current?.focus();
		}
		document.addEventListener("pointerdown", dismiss);
		document.addEventListener("keydown", dismissWithEscape);
		return () => {
			document.removeEventListener("pointerdown", dismiss);
			document.removeEventListener("keydown", dismissWithEscape);
		};
	}, [open]);

	function close() {
		setOpen(false);
		trigger.current?.focus();
	}

	return (
		<div
			ref={root}
			className={styles.root}
			onBlur={(event) => {
				if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
			}}
		>
			<button
				ref={trigger}
				type="button"
				className={styles.trigger}
				aria-label={data ? copy.bell(data.count) : copy.title}
				aria-expanded={open}
				aria-controls={`${id}-panel`}
				onClick={() => {
					setOpen(!open);
					if (!open) void refresh();
				}}
			>
				<Icon icon={Notification01Icon} size={24} />
				{data && data.count > 0 ? <span className={styles.badge} aria-hidden="true">{copy.badge(data.count)}</span> : null}
			</button>
			<p className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
			<section id={`${id}-panel`} className={styles.panel} aria-labelledby={`${id}-title`} hidden={!open}>
				<header className={styles.header}>
					<div className={styles.heading}>
						<h2 id={`${id}-title`}>{copy.title}</h2>
						{data ? <span className={styles.count}>{copy.count(data.count)}</span> : null}
					</div>
					<Button size="xs" variant="secondary" icon={Cancel01Icon} onClick={close}>{copy.close}</Button>
				</header>
				{failed ? (
					<div className={styles.error}>
						<p role="alert">{accessLost ? copy.sessionExpired : copy.error}</p>
						{accessLost ? (
							<Link href="/sign-in" className={styles.signIn}>{copy.signIn}</Link>
						) : (
							<Button size="sm" variant="secondary" loading={pending} onClick={() => void refresh()}>
								{pending ? copy.refreshing : copy.retry}
							</Button>
						)}
					</div>
				) : null}
				{data?.notifications.length ? (
					<ul className={styles.list} role="list" aria-label={copy.title}>
						{data.notifications.map((item) => (
							<li key={item.id}>
								<Link href={`/family/requests/${item.id}`} className={styles.item} onClick={() => setOpen(false)}>
									<span className={styles.itemIcon}><Icon icon={ShoppingBasket01Icon} size={24} /></span>
									<span className={styles.itemText}>
										<span>{copy.message(item.displayName)}</span>
										<time dateTime={item.submittedAt}>{formatDate(item.submittedAt)} · {formatTime(item.submittedAt)} UTC</time>
									</span>
								</Link>
							</li>
						))}
					</ul>
				) : data && !failed ? (
					<div className={styles.empty}>
						<Icon icon={CheckmarkCircle02Icon} size={32} />
						<h3>{copy.empty}</h3>
						<p>{copy.emptyHelp}</p>
					</div>
				) : null}
				<Link href="/family/requests" className={styles.viewAll} onClick={() => setOpen(false)}>{copy.viewAll}</Link>
			</section>
		</div>
	);
}
