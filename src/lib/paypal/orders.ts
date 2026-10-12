import "server-only";
import { z } from "zod";
import { requireUsd, subtotalMinor, usdDecimal, usdMinor } from "@/lib/money";
import type { PayPalClient } from "@/lib/paypal/client";
import { PayPalError } from "@/lib/paypal/errors";
import { orderIdSchema, orderItemsSchema, orderResponseSchema, type OrderInput, type PayPalOrder } from "@/lib/paypal/schemas";

type OrderClient = Pick<PayPalClient, "orderRequest">;

export function orderBody(input: OrderInput) {
	z.uuid().parse(input.paymentId);
	z.uuid().parse(input.basketId);
	requireUsd(input.currency);
	const items = orderItemsSchema.parse(input.items);
	const total = subtotalMinor(items);
	if (total <= 0 || total !== input.amountMinor) throw new PayPalError("CONFIGURATION", "NOT_CREATED");
	const amount = { currency_code: "USD" as const, value: usdDecimal(total) };
	return {
		intent: "CAPTURE" as const,
		purchase_units: [{ reference_id: input.basketId, custom_id: input.paymentId,
			amount: { ...amount, breakdown: { item_total: amount } },
			items: items.map((item) => ({ name: item.name, sku: item.sku, quantity: String(item.quantity),
				unit_amount: { currency_code: "USD", value: usdDecimal(item.unitPriceMinor) }, category: "PHYSICAL_GOODS" })),
		}],
		payment_source: { paypal: { experience_context: {
			shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW", brand_name: "CareBasket Demo Market",
		} } },
	};
}

export function verifyOrder(value: unknown, input: OrderInput, expectedId?: string): PayPalOrder {
	const parsed = orderResponseSchema.safeParse(value);
	if (!parsed.success) throw new PayPalError("INVALID_RESPONSE");
	const order = parsed.data;
	const unit = order.purchase_units[0];
	if ((expectedId && order.id !== expectedId) || unit.reference_id !== input.basketId || unit.custom_id !== input.paymentId
		|| usdMinor(unit.amount.value) !== input.amountMinor
		|| (unit.amount.breakdown && usdMinor(unit.amount.breakdown.item_total.value) !== input.amountMinor)) {
		throw new PayPalError("INVALID_RESPONSE");
	}
	return { id: order.id, status: order.status,
		hasPayments: Boolean(unit.payments?.captures?.length || unit.payments?.authorizations?.length || unit.payments?.refunds?.length) };
}

export async function createSandboxOrder(client: OrderClient, input: OrderInput): Promise<PayPalOrder> {
	// UUID is 36 bytes, within PayPal's request-ID limit. Do not mint a new key on retry.
	return verifyOrder(await client.orderRequest("/v2/checkout/orders", orderBody(input), input.paymentId), input);
}

export async function readSandboxOrder(client: OrderClient, input: OrderInput, id: string): Promise<PayPalOrder> {
	orderIdSchema.parse(id);
	return verifyOrder(await client.orderRequest(`/v2/checkout/orders/${id}`), input, id);
}

export function isUnapprovedOrder(order: PayPalOrder): boolean {
	return ["CREATED", "PAYER_ACTION_REQUIRED"].includes(order.status) && !order.hasPayments;
}
