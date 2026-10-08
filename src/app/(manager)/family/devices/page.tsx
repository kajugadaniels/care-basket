import type { Metadata } from "next";
import { ActionLink } from "@/components/ui/ActionLink/ActionLink";
import { DeviceList } from "@/features/devices/components/DeviceList/DeviceList";
import { devicesCopy } from "@/features/devices/copy";
import { deviceListSchema } from "@/features/devices/schemas";
import { listDevices } from "@/features/devices/server/service";
import { requireAdult } from "@/server/auth/require-adult";
import styles from "./page.module.css";

export const metadata: Metadata = { title: devicesCopy.title };
export default async function DevicesPage({ searchParams }: { searchParams: Promise<{ after?: string | string[] }> }) {
  const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
  const parsed = deviceListSchema.safeParse(await searchParams);
  const input = parsed.success ? parsed.data : {};
  const result = await listDevices(actor, input);
  return <div className={styles.page}>
    <header className={styles.header}><div><h1>{devicesCopy.title}</h1><p>{devicesCopy.description}</p></div>
      <ActionLink href="/family/devices/connect">{devicesCopy.connect}</ActionLink></header>
    <DeviceList devices={result.devices} />
    <div className={styles.actions}>
      {result.nextCursor ? <ActionLink href={`/family/devices?after=${result.nextCursor}`} variant="secondary">{devicesCopy.next}</ActionLink> : null}
      {input.after ? <ActionLink href="/family/devices" variant="secondary">{devicesCopy.first}</ActionLink> : null}
    </div>
  </div>;
}
