"use client";

import { CancelCircleIcon, CheckmarkCircle02Icon, Clock01Icon, SmartPhone01Icon } from "@hugeicons/core-free-icons";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Icon } from "@/components/ui/Icon/Icon";
import { ManagerDataGrid } from "@/components/ui/ManagerDataGrid/ManagerDataGrid";
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

function DeviceIdentityCell({ data }: ICellRendererParams<DeviceDto>) {
	if (!data) return null;
	return (
		<div className={styles.gridIdentity}>
			<span className={styles.gridDeviceIcon}><Icon icon={SmartPhone01Icon} size={20} /></span>
			<span>
				<strong>{data.label}</strong>
				<small>{data.userAgentSummary}</small>
			</span>
		</div>
	);
}

function DeviceStatusCell({ data }: ICellRendererParams<DeviceDto>) {
	if (!data) return null;
	return (
		<span className={cx(styles.status, STATUS_STYLES[data.status])}>
			<Icon icon={STATUS_ICONS[data.status]} size={20} />
			{devicesCopy.states[data.status]}
		</span>
	);
}

function DeviceDateCell({ value }: ICellRendererParams<DeviceDto, string>) {
	if (!value) return null;
	return <time dateTime={value} className={styles.gridDate}>{formatDate(value)}</time>;
}

function DeviceActionCell({ data }: ICellRendererParams<DeviceDto>) {
	if (!data || data.status !== "ACTIVE") return <span className={styles.unavailable}>—</span>;
	return <RevokeDeviceDialog deviceId={data.id} label={data.label} />;
}

const COLUMNS: ColDef<DeviceDto>[] = [
	{ colId: "device", headerName: devicesCopy.gridColumns.device, flex: 1.4, minWidth: 210,
		valueGetter: ({ data }) => data ? `${data.label} ${data.userAgentSummary}` : "", cellRenderer: DeviceIdentityCell },
	{ field: "profileName", headerName: devicesCopy.gridColumns.member, flex: 1, minWidth: 150 },
	{ field: "status", headerName: devicesCopy.gridColumns.status, flex: 0.8, minWidth: 130,
		valueFormatter: ({ value }) => value ? devicesCopy.states[value] : "", cellRenderer: DeviceStatusCell },
	{ field: "createdAt", headerName: devicesCopy.gridColumns.connected, flex: 1, minWidth: 150, cellRenderer: DeviceDateCell },
	{ field: "lastSeenAt", headerName: devicesCopy.gridColumns.activity, flex: 1, minWidth: 150, cellRenderer: DeviceDateCell },
	{ colId: "action", headerName: devicesCopy.gridColumns.action, flex: 0.9, minWidth: 150, sortable: false,
		cellRenderer: DeviceActionCell, cellClass: styles.actionCell },
];

function DeviceCards({ devices }: { devices: DeviceDto[] }) {
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
						<h2 id={`device-${device.id}`} tabIndex={-1} className={styles.title}>{device.label}</h2>
						<p className={styles.owner}>{devicesCopy.assignedTo(device.profileName)}</p>
						<p className={styles.browser}>{device.userAgentSummary}</p>
					</div>
					<dl className={styles.facts}>
						<div>
							<dt className={styles.term}>{devicesCopy.connected}</dt>
							<dd><time dateTime={device.createdAt}>{formatDate(device.createdAt)}</time></dd>
						</div>
						<div>
							<dt className={styles.term}>{devicesCopy.lastActivity}</dt>
							<dd><time dateTime={device.lastSeenAt}>{formatDate(device.lastSeenAt)}</time></dd>
						</div>
					</dl>
					{device.status === "ACTIVE" ? (
						<div className={styles.action}><RevokeDeviceDialog deviceId={device.id} label={device.label} /></div>
					) : null}
				</li>
			))}
		</ul>
	);
}

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
		<ManagerDataGrid
			columns={COLUMNS}
			label={devicesCopy.gridLabel}
			mobileFallback={<DeviceCards devices={devices} />}
			noMatches={devicesCopy.gridNoMatches}
			rows={devices}
			searchLabel={devicesCopy.gridSearch}
			searchPlaceholder={devicesCopy.gridSearchPlaceholder}
		/>
	);
}
