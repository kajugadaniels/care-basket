import { CheckmarkCircle02Icon, Clock01Icon, CancelCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/ui/Icon/Icon";
import { formatDate } from "@/lib/format";
import { devicesCopy } from "../../copy";
import type { DeviceDto } from "../../types";
import { RevokeDeviceDialog } from "../RevokeDeviceDialog/RevokeDeviceDialog";
import styles from "./DeviceList.module.css";

export function DeviceList({ devices }: { devices: DeviceDto[] }) {
  if (!devices.length) return <p className={styles.empty}>{devicesCopy.empty}</p>;
  return <ul className={styles.list}>
    {devices.map((device) => <li key={device.id} className={styles.card}>
      <h2 id={`device-${device.id}`} tabIndex={-1}>{device.label}</h2><p>{device.profileName}</p><p>{device.userAgentSummary}</p>
      <p className={styles.status}><Icon icon={device.status === "ACTIVE" ? CheckmarkCircle02Icon : device.status === "EXPIRED" ? Clock01Icon : CancelCircleIcon} size={24} />{devicesCopy.states[device.status]}</p>
      <dl className={styles.facts}>
        <div><dt>{devicesCopy.connected}</dt><dd><time dateTime={device.createdAt}>{formatDate(device.createdAt)}</time></dd></div>
        <div><dt>{devicesCopy.lastActivity}</dt><dd><time dateTime={device.lastSeenAt}>{formatDate(device.lastSeenAt)}</time></dd></div>
      </dl>
      {device.status === "ACTIVE" ? <RevokeDeviceDialog deviceId={device.id} label={device.label} /> : null}
    </li>)}
  </ul>;
}
