import type { Metadata } from "next";
import { z } from "zod";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { ApprovalForm } from "@/features/devices/components/ApprovalForm/ApprovalForm";
import { devicesCopy } from "@/features/devices/copy";
import { getManagedProfile, listManagedProfiles } from "@/features/profiles/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import styles from "../page.module.css";

export const metadata: Metadata = { title: devicesCopy.approvalTitle };
const querySchema = z.strictObject({ profileId: z.uuid().optional(), after: z.uuid().optional() });
export default async function DeviceConnectPage({ searchParams }: { searchParams: Promise<{ profileId?: string | string[]; after?: string | string[] }> }) {
  const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
  const parsed = querySchema.safeParse(await searchParams);
  const query = parsed.success ? parsed.data : {};
  const [page, suggested] = await Promise.all([
    listManagedProfiles(actor, { after: query.after }),
    query.profileId ? getManagedProfile(actor, query.profileId).catch((error: unknown) => {
      if (error instanceof AppError && error.code === "NOT_FOUND") return null;
      throw error;
    }) : null,
  ]);
  const profiles = page.profiles.map(({ id, displayName }) => ({ id, displayName }));
  if (suggested && !profiles.some((p) => p.id === suggested.id)) profiles.unshift({ id: suggested.id, displayName: suggested.displayName });
  return <div className={styles.page}>
    <h1>{devicesCopy.approvalTitle}</h1><p>{devicesCopy.approvalDescription}</p>
    {profiles.length ? <ApprovalForm profiles={profiles} preselected={suggested?.id} />
      : <><p>{devicesCopy.noProfiles}</p><ActionLink href="/family/members/add">{devicesCopy.addProfile}</ActionLink></>}
    <div className={styles.actions}>
      {page.nextCursor ? <ActionLink href={`/family/devices/connect?after=${page.nextCursor}`} variant="secondary">{devicesCopy.moreProfiles}</ActionLink> : null}
      {query.after ? <ActionLink href="/family/devices/connect" variant="secondary">{devicesCopy.first}</ActionLink> : null}
      <ActionLink href="/family/devices" variant="secondary">{devicesCopy.backDevices}</ActionLink>
    </div>
  </div>;
}
