import { CancelCircleIcon, CheckmarkCircle02Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
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

// DeviceListSkeleton mirrors these cards.
export function DeviceList({ devices }: { devices: DeviceDto[] }) {
	if (!devices.length) {
		return <p className={styles.empty}>{devicesCopy.empty}</p>;
	}

	return (
		<ul className={styles.list}>
			{devices.map((device) => (
				<li key={device.id} className={styles.card}>
					{/* Focus target after this device is disconnected. */}
					<h2 id={`device-${device.id}`} tabIndex={-1} className={styles.title}>
						{device.label}
					</h2>
					<p>{device.profileName}</p>
					<p>{device.userAgentSummary}</p>
					<p className={styles.status}>
						<Icon icon={STATUS_ICONS[device.status]} size={24} />
						{devicesCopy.states[device.status]}
					</p>
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
					{device.status === "ACTIVE" ? <RevokeDeviceDialog deviceId={device.id} label={device.label} /> : null}
				</li>
			))}
		</ul>
	);
}
