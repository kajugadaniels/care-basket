import "server-only";
import { z } from "zod";
import { getPayPalClient } from "@/lib/paypal/client";
import { PayPalError } from "@/lib/paypal/errors";
import { createSandboxOrder, isUnapprovedOrder, readSandboxOrder } from "@/lib/paypal/orders";
import { orderItemsSchema, type OrderInput } from "@/lib/paypal/schemas";
import type { AdultActor } from "@/server/auth/require-adult";
import { AppError } from "@/server/errors";
import { cancelCheckoutSchema, startCheckoutSchema } from "../schemas";
import type { CheckoutDto } from "../types";
import { claimAttempt, releaseOperation, savePreparedOrder, voidAttempt } from "./attempt-repository";
import { CheckoutFailure } from "./failure";
import type { PaymentAttempt } from "./persistence";
import { readLatestPayment, reserveCheckout } from "./repository";
import { checkoutDto } from "./checkout-dto";

function assertManager(actor: AdultActor) {
	if (!actor || actor.type !== "adult" || !["OWNER", "MANAGER"].includes(actor.role)) throw new AppError("FORBIDDEN");
}

function orderInput(payment: PaymentAttempt): OrderInput {
	const parsed = orderItemsSchema.safeParse(payment.orderItems);
	if (!parsed.success) throw new CheckoutFailure("RECONCILIATION");
	return { paymentId: payment.id, basketId: payment.basketId, amountMinor: payment.amountMinor,
		currency: payment.currency, items: parsed.data };
}

export async function getCheckout(actor: AdultActor, requestId: string): Promise<CheckoutDto | null> {
	assertManager(actor);
	if (!z.uuid().safeParse(requestId).success) throw new AppError("NOT_FOUND");
	const payment = await readLatestPayment(actor, requestId);
	return payment ? checkoutDto(payment) : null;
}

export async function startCheckout(actor: AdultActor, value: unknown): Promise<CheckoutDto> {
	assertManager(actor);
	const input = startCheckoutSchema.parse(value);
	let client: ReturnType<typeof getPayPalClient>;
	try { client = getPayPalClient(); } catch { throw new CheckoutFailure("CONFIGURATION"); }
	const reserved = await reserveCheckout(actor, input, client.clientId);
	if (reserved.kind === "repriced") throw new CheckoutFailure("PRICE_CHANGED");
	if (reserved.payment.paypalClientId !== client.clientId) throw new CheckoutFailure("CONFIGURATION");
	if (reserved.payment.paypalOrderId) return checkoutDto(reserved.payment);
	const { payment, token, isFirstCreation } = await claimAttempt(actor, input.requestId, reserved.payment.id, "CREATE");
	try {
		// Another worker may have finished between reservation and lease acquisition.
		if (payment.paypalOrderId) {
			await releaseOperation(actor, input.requestId, payment.id, token, false);
			return checkoutDto(payment);
		}
		// Network only AFTER the transaction has committed. The persisted lines/key never change.
		const order = await createSandboxOrder(client, orderInput(payment));
		if (!isUnapprovedOrder(order)) throw new CheckoutFailure("RECONCILIATION");
		await savePreparedOrder(actor, input.requestId, payment.id, token, order.id);
		return checkoutDto({ ...payment, paypalOrderId: order.id });
	} catch (error) {
		// A rejection of a RETRY cannot disprove an earlier timed-out create.
		if (isFirstCreation && error instanceof PayPalError && error.outcome === "NOT_CREATED") {
			await voidAttempt(actor, input.requestId, payment.id, token, null, true);
			throw new CheckoutFailure("REJECTED");
		}
		await releaseOperation(actor, input.requestId, payment.id, token);
		if (error instanceof CheckoutFailure || error instanceof AppError) throw error;
		throw new CheckoutFailure("PROVIDER");
	}
}

export async function cancelCheckout(actor: AdultActor, value: unknown): Promise<{ requestId: string }> {
	assertManager(actor);
	const input = cancelCheckoutSchema.parse(value);
	const { payment, token } = await claimAttempt(actor, input.requestId, input.paymentId, "CANCEL", input.revision);
	try {
		if (!payment.paypalOrderId && !payment.creationStartedAt) {
			// No create worker ever started; the lease fences out a later worker.
			return await voidAttempt(actor, input.requestId, payment.id, token, null);
		}
		const client = getPayPalClient();
		if (payment.paypalClientId !== client.clientId) throw new CheckoutFailure("CONFIGURATION");
		const details = orderInput(payment);
		const order = payment.paypalOrderId ? await readSandboxOrder(client, details, payment.paypalOrderId)
			: await createSandboxOrder(client, details); // Recover the unknown create with the ORIGINAL key.
		if (!isUnapprovedOrder(order)) throw new CheckoutFailure("RECONCILIATION");
		// Orders v2 has no generic order-void endpoint. Abandon locally only; never capture this attempt.
		return await voidAttempt(actor, input.requestId, payment.id, token, order.id);
	} catch (error) {
		await releaseOperation(actor, input.requestId, payment.id, token);
		if (error instanceof CheckoutFailure || error instanceof AppError) throw error;
		throw new CheckoutFailure(error instanceof PayPalError && error.kind === "CONFIGURATION" ? "CONFIGURATION" : "PROVIDER");
	}
}
