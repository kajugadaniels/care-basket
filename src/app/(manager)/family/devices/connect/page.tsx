import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader/PageHeader";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ApprovalForm } from "@/features/devices/components/ApprovalForm/ApprovalForm";
import { ApprovalFormSkeleton } from "@/features/devices/components/ApprovalForm/ApprovalFormSkeleton";
import { devicesCopy } from "@/features/devices/copy";
import { getManagedProfile, listManagedProfiles } from "@/features/profiles/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import styles from "../page.module.css";

export const metadata: Metadata = { title: devicesCopy.approvalTitle };

const querySchema = z.strictObject({ profileId: z.uuid().optional(), after: z.uuid().optional() });

type DeviceConnectPageProps = {
	searchParams: Promise<{ profileId?: string | string[]; after?: string | string[] }>;
};

// The header and instructions are static and render at once; the family's profiles stream in.
export default function DeviceConnectPage({ searchParams }: DeviceConnectPageProps) {
	return (
		<div className={styles.page}>
			<PageHeader
				title={devicesCopy.approvalTitle}
				description={devicesCopy.approvalDescription}
				back={{ href: "/family/devices", label: devicesCopy.backDevices }}
			/>
			<Suspense fallback={<ApprovalFormSkeleton />}>
				<DeviceApproval searchParams={searchParams} />
			</Suspense>
		</div>
	);
}

// The profileId in the URL is only a suggestion: it must resolve inside the adult's own family.
async function DeviceApproval({ searchParams }: DeviceConnectPageProps) {
	const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
	const parsed = querySchema.safeParse(await searchParams);
	const query = parsed.success ? parsed.data : {};
	const [page, suggested] = await Promise.all([
		listManagedProfiles(actor, { after: query.after }),
		query.profileId
			? getManagedProfile(actor, query.profileId).catch((error: unknown) => {
				if (error instanceof AppError && error.code === "NOT_FOUND") return null;
				throw error;
			})
			: null,
	]);

	const profiles = page.profiles.map(({ id, displayName }) => ({ id, displayName }));
	if (suggested && !profiles.some((profile) => profile.id === suggested.id)) {
		profiles.unshift({ id: suggested.id, displayName: suggested.displayName });
	}
	const hasPagination = Boolean(page.nextCursor || query.after);

	return (
		<>
			{profiles.length ? (
				<ApprovalForm profiles={profiles} preselected={suggested?.id} />
			) : (
				<div className={styles.noProfiles}>
					<p>{devicesCopy.noProfiles}</p>
					<ActionLink href="/family/members/add">{devicesCopy.addProfile}</ActionLink>
				</div>
			)}
			{hasPagination ? (
				<div className={styles.actions}>
					{page.nextCursor ? (
						<ActionLink href={`/family/devices/connect?after=${page.nextCursor}`} variant="secondary">
							{devicesCopy.moreProfiles}
						</ActionLink>
					) : null}
					{query.after ? (
						<ActionLink href="/family/devices/connect" variant="secondary">
							{devicesCopy.first}
						</ActionLink>
					) : null}
				</div>
			) : null}
		</>
	);
}
