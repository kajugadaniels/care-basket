import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ApprovalFormSkeleton } from "@/features/devices/components/ApprovalForm/ApprovalFormSkeleton";
import { devicesCopy } from "@/features/devices/copy";
import styles from "../page.module.css";

// This boundary belongs to the nested route itself. The parent devices boundary
// is already resolved when navigating from /family/devices to /connect.
export default function DeviceConnectLoading() {
	return (
		<div className={styles.page}>
			<PageHeader
				title={devicesCopy.approvalTitle}
				description={devicesCopy.approvalDescription}
				back={{ href: "/family/devices", label: devicesCopy.backDevices }}
			/>
			<ApprovalFormSkeleton />
		</div>
	);
}
