import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { DeviceListSkeleton } from "@/features/devices/components/DeviceList/DeviceListSkeleton";
import { devicesCopy } from "@/features/devices/copy";
import styles from "./page.module.css";

// Matches the devices page: the static header is real, only the device cards are placeholders.
export default function DevicesLoading() {
	return (
		<div className={styles.page}>
			<PageHeader
				title={devicesCopy.title}
				description={devicesCopy.description}
				actions={<ActionLink href="/family/devices/connect">{devicesCopy.connect}</ActionLink>}
			/>
			<DeviceListSkeleton />
		</div>
	);
}
