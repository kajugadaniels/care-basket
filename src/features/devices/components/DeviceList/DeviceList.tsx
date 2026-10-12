import { CancelCircleIcon, CheckmarkCircle02Icon, Clock01Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { cx } from "@/lib/class-names";
import { formatDate } from "@/lib/format";
import { devicesCopy } from "../../copy";
import type { DeviceDto } from "../../types";
import { RevokeDeviceDialog } from "../RevokeDeviceDialog/RevokeDeviceDialog";
import styles from "./DeviceList.module.css";

const STATUS_ICONS = {
	ACTIVE: CheckmarkCircle02Icon,
	EXPIRED: Clock01Icon,
	REVOKED: CancelCircleIcon,
} as const;

const STATUS_STYLES = {
	ACTIVE: styles.active,
	EXPIRED: styles.expired,
	REVOKED: styles.revoked,
} as const;

export function DeviceList({ devices }: { devices: DeviceDto[] }) {
	if (!devices.length) {
		return (
			<section className={styles.empty} aria-labelledby="devices-empty-title">
				<span className={styles.emptyIcon}><Icon icon={SmartPhone01Icon} size={48} /></span>
				<div className={styles.emptyText}>
					<h2 id="devices-empty-title">{devicesCopy.empty}</h2>
					<p>{devicesCopy.emptyHelp}</p>
				</div>
			</section>
		);
	}

	return (
		<ul className={styles.list} role="list" aria-label={devicesCopy.title}>
			{devices.map((device) => (
				<li key={device.id} className={styles.card}>
					<div className={styles.header}>
						<span className={styles.deviceIcon}><Icon icon={SmartPhone01Icon} size={24} /></span>
						<span className={cx(styles.status, STATUS_STYLES[device.status])}>
							<Icon icon={STATUS_ICONS[device.status]} size={20} />
							{devicesCopy.states[device.status]}
						</span>
					</div>
					<div className={styles.identity}>
						{/* Revocation returns focus here when the action disappears. */}
						<h2 id={`device-${device.id}`} tabIndex={-1} className={styles.title}>
							{device.label}
						</h2>
						<p className={styles.owner}>{devicesCopy.assignedTo(device.profileName)}</p>
						<p className={styles.browser}>{device.userAgentSummary}</p>
					</div>
					<dl className={styles.facts}>
						<div>
							<dt className={styles.term}>{devicesCopy.connected}</dt>
							<dd>
								<time dateTime={device.createdAt}>{formatDate(device.createdAt)}</time>
							</dd>
						</div>
						<div>
							<dt className={styles.term}>{devicesCopy.lastActivity}</dt>
							<dd>
								<time dateTime={device.lastSeenAt}>{formatDate(device.lastSeenAt)}</time>
							</dd>
						</div>
					</dl>
					{device.status === "ACTIVE" ? (
						<div className={styles.action}>
							<RevokeDeviceDialog deviceId={device.id} label={device.label} />
						</div>
					) : null}
				</li>
			))}
		</ul>
	);
}
