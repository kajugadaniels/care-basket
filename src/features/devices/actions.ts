"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readDeviceCookie, setDeviceCookie, clearPairingCookie } from "@/server/auth/device-cookies";
import { requireAdult } from "@/server/auth/require-adult";
import { enforceRateLimit } from "@/server/rate-limit/limiter";
import { pairingStartKey } from "@/server/rate-limit/client-key";
import type { ActionResult } from "@/types/action-result";
import { approvePairingSchema, lookupPairingSchema, rejectPairingSchema, revokeDeviceSchema, startPairingSchema } from "./schemas";
import { approvePairing, completePairing, disconnectDevice, rejectPairing, reviewPairing, startPairing } from "./server/service";
import { deviceFailure } from "./server/action-failure";
import type { DeviceResult, PairingStartDto, PairingReviewDto } from "./types";

export async function startPairingAction(input: unknown): Promise<ActionResult<PairingStartDto>> {
  try {
    const requestHeaders = await headers();
    await enforceRateLimit(pairingStartKey(requestHeaders), 5, 60 * 60_000);
    startPairingSchema.parse(input);
    const result = await startPairing(requestHeaders.get("user-agent"), await readDeviceCookie("pairing"));
    await setDeviceCookie("pairing", result.secret, result.expiresAt);
    return { ok: true, data: { code: result.code, expiresAt: result.expiresAt.toISOString() } };
  } catch (error) { return deviceFailure(error); }
}
export async function reviewPairingAction(input: unknown): Promise<ActionResult<PairingReviewDto>> {
  try {
    const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
    return { ok: true, data: await reviewPairing(actor, lookupPairingSchema.parse(input)) };
  } catch (error) { return deviceFailure(error); }
}
export async function approvePairingAction(input: unknown): Promise<DeviceResult> {
  try {
    const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
    await approvePairing(actor, approvePairingSchema.parse(input));
    revalidatePath("/family/devices");
    return { ok: true, data: { done: true } };
  } catch (error) { return deviceFailure(error); }
}
export async function rejectPairingAction(input: unknown): Promise<DeviceResult> {
  try {
    const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
    await rejectPairing(actor, rejectPairingSchema.parse(input));
    revalidatePath("/family/devices");
    return { ok: true, data: { done: true } };
  } catch (error) { return deviceFailure(error); }
}
export async function completePairingAction(input: unknown): Promise<DeviceResult> {
  try {
    startPairingSchema.parse(input);
    const result = await completePairing();
    await setDeviceCookie("device", result.secret, result.expiresAt);
    await clearPairingCookie();
  } catch (error) { return deviceFailure(error); }
  redirect("/shop");
}
export async function revokeDeviceAction(input: unknown): Promise<DeviceResult> {
  try {
    const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
    await disconnectDevice(actor, revokeDeviceSchema.parse(input));
    revalidatePath("/family/devices");
    revalidatePath("/shop");
    return { ok: true, data: { done: true } };
  } catch (error) { return deviceFailure(error); }
}
