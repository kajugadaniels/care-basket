"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireAdult } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import { logSecurityFailure } from "@/server/logger";
import { enforceRateLimit } from "@/server/rate-limit/limiter";
import { checkoutCopy } from "./copy";
import { cancelCheckoutSchema, captureCheckoutSchema, startCheckoutSchema } from "./schemas";
import { CheckoutFailure } from "./server/failure";
import { cancelCheckout, startCheckout } from "./server/service";
import { reconcileCheckout } from "./server/capture-service";
import type { CancelCheckoutResult, CheckoutResult } from "./types";

function invalidate(requestId: string) {
	revalidatePath("/family");
	revalidatePath("/family/requests");
	revalidatePath(`/family/requests/${requestId}`);
	revalidatePath(`/family/requests/${requestId}/checkout`);
	revalidatePath("/shop/requests");
	revalidatePath(`/shop/requests/${requestId}`);
}

function failure(error: unknown) {
	unstable_rethrow(error);
	const code = error instanceof z.ZodError ? "VALIDATION_FAILED" : error instanceof AppError ? error.code : "INTERNAL";
	const reason = error instanceof CheckoutFailure ? error.reason : code;
	if (code === "INTERNAL") logSecurityFailure({ event: "checkout.action_failed", requestId: randomUUID(), actorType: "SYSTEM", code });
	return { ok: false as const, error: { code,
		message: checkoutCopy.errors[reason as keyof typeof checkoutCopy.errors] ?? checkoutCopy.errors.INTERNAL } };
}

export async function startCheckoutAction(value: unknown): Promise<CheckoutResult> {
	let requestId: string | undefined;
	try {
		const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
		const input = startCheckoutSchema.parse(value);
		requestId = input.requestId;
		await enforceRateLimit(`checkout:start:${actor.familyId}:${input.requestId}`, 10, 60 * 60_000);
		return { ok: true, data: await startCheckout(actor, input) };
	} catch (error) { return failure(error); }
	finally {
		// Price conflicts and uncertain provider results may already have committed local state.
		if (requestId) invalidate(requestId);
	}
}

export async function cancelCheckoutAction(value: unknown): Promise<CancelCheckoutResult> {
	let requestId: string | undefined;
	try {
		const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
		const input = cancelCheckoutSchema.parse(value);
		requestId = input.requestId;
		await enforceRateLimit(`checkout:cancel:${actor.familyId}:${input.requestId}`, 10, 60 * 60_000);
		return { ok: true, data: await cancelCheckout(actor, input) };
	} catch (error) { return failure(error); }
	finally { if (requestId) invalidate(requestId); }
}

async function paymentAction(value: unknown, capture: boolean): Promise<CheckoutResult> {
	let requestId: string | undefined;
	try {
		const actor = await requireAdult({ roles: ["OWNER", "MANAGER"] });
		const input = captureCheckoutSchema.parse(value);
		requestId = input.requestId;
		await enforceRateLimit(`checkout:payment:${actor.familyId}:${input.requestId}`, 10, 60_000);
		return { ok: true, data: await reconcileCheckout(actor, input, capture) };
	} catch (error) { return failure(error); }
	finally { if (requestId) invalidate(requestId); }
}

export async function captureCheckoutAction(value: unknown): Promise<CheckoutResult> {
	return paymentAction(value, true);
}

export async function refreshCheckoutAction(value: unknown): Promise<CheckoutResult> {
	return paymentAction(value, false);
}
