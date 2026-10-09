"use server";

import { revalidatePath } from "next/cache";
import { requireAdult } from "@/server/auth/require-adult";
import { requireDevice, assertDevicePermission } from "@/server/auth/require-device";
import { enforceRateLimit } from "@/server/rate-limit/limiter";
import type { RequestMutationResult } from "./types";
import { cancelRequest, declineRequest, removeRequestItem, submitRequest, updateRequestItem } from "./server/service";
import { requestFailure } from "./server/action-failure";

function invalidate(requestId: string) {
	revalidatePath("/family");
	revalidatePath("/family/requests");
	revalidatePath(`/family/requests/${requestId}`);
	revalidatePath("/shop/requests");
	revalidatePath(`/shop/requests/${requestId}`);
}
export async function submitRequestAction(input: unknown): Promise<RequestMutationResult> {
	try {
		const actor = await requireDevice();
		assertDevicePermission(actor, "create-own-request");
		await enforceRateLimit(`request:submit:${actor.deviceId}`, 20, 60 * 60_000);
		const result = await submitRequest(actor, input);
		invalidate(result.requestId);
		return { ok: true, data: result };
	} catch (error) { return requestFailure(error); }
}
export async function cancelRequestAction(input: unknown): Promise<RequestMutationResult> {
	try {
		const result = await cancelRequest(await requireDevice(), input);
		invalidate(result.requestId);
		return { ok: true, data: result };
	} catch (error) { return requestFailure(error); }
}
export async function updateRequestItemAction(input: unknown): Promise<RequestMutationResult> {
	try {
		const result = await updateRequestItem(await requireAdult({ roles: ["OWNER", "MANAGER"] }), input);
		invalidate(result.requestId);
		return { ok: true, data: result };
	} catch (error) { return requestFailure(error); }
}
export async function removeRequestItemAction(input: unknown): Promise<RequestMutationResult> {
	try {
		const result = await removeRequestItem(await requireAdult({ roles: ["OWNER", "MANAGER"] }), input);
		invalidate(result.requestId);
		return { ok: true, data: result };
	} catch (error) { return requestFailure(error); }
}
export async function declineRequestAction(input: unknown): Promise<RequestMutationResult> {
	try {
		const result = await declineRequest(await requireAdult({ roles: ["OWNER", "MANAGER"] }), input);
		invalidate(result.requestId);
		return { ok: true, data: result };
	} catch (error) { return requestFailure(error); }
}
