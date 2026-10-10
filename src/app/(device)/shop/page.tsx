import type { Metadata } from "next";
import { ShopHome } from "@/features/devices/components/ShopHome/ShopHome";
import { devicesCopy } from "@/features/devices/copy";
import { getShopHome } from "@/features/devices/server/service";
import type { ShopHomeDto } from "@/features/devices/types";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: devicesCopy.welcome, robots: { index: false } };
export default async function ShopPage() {
  let profile: ShopHomeDto | null = null;
  try { profile = await getShopHome(await requireDevice()); }
  catch (error) { if (!(error instanceof AppError) || error.code !== "UNAUTHENTICATED") throw error; }
  return <ShopHome profile={profile} />;
}
