import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { DeviceList } from "@/features/devices/components/DeviceList/DeviceList";
import { DeviceListSkeleton } from "@/features/devices/components/DeviceList/DeviceListSkeleton";
import { devicesCopy } from "@/features/devices/copy";
import { deviceListSchema } from "@/features/devices/schemas";
import { listDevices } from "@/features/devices/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import styles from "./page.module.css";

export const metadata: Metadata = { title: devicesCopy.title };

type DevicesPageProps = {
	searchParams: Promise<{ after?: string | string[] }>;
};

// The header and its connect action are static and render at once; the devices stream in.
export default function DevicesPage({ searchParams }: DevicesPageProps) {
	return (
		<div className={styles.page}>
			<PageHeader
				title={devicesCopy.title}
				description={devicesCopy.description}
				actions={<ActionLink href="/family/devices/connect">{devicesCopy.connect}</ActionLink>}
			/>
			<Suspense fallback={<DeviceListSkeleton />}>
				<DeviceDirectory searchParams={searchParams} />
			</Suspense>
		</div>
	);
}

async function DeviceDirectory({ searchParams }: DevicesPageProps) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const parsed = deviceListSchema.safeParse(await searchParams);
	const input = parsed.success ? parsed.data : {};
	const { devices, nextCursor } = await listDevices(actor, input);
	const hasPagination = Boolean(nextCursor || input.after);

	return (
		<>
			<DeviceList devices={devices} />
			{hasPagination ? (
				<div className={styles.actions}>
					{nextCursor ? (
						<ActionLink href={`/family/devices?after=${nextCursor}`} variant="secondary">
							{devicesCopy.next}
						</ActionLink>
					) : null}
					{input.after ? (
						<ActionLink href="/family/devices" variant="secondary">
							{devicesCopy.first}
						</ActionLink>
					) : null}
				</div>
			) : null}
		</>
	);
}
