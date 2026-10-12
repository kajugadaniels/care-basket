// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { requestIds } from "@/test/factories/requests";
vi.mock("server-only", () => ({}));
import { createSandboxOrder, isUnapprovedOrder, orderBody, readSandboxOrder, verifyOrder } from "./orders";
import type { OrderInput } from "./schemas";

const input: OrderInput = { paymentId: requestIds.key, basketId: requestIds.basket, amountMinor: 597, currency: "USD",
	items: [{ sku: "rice", name: "Rice · 1 lb", quantity: 3, unitPriceMinor: 199 }] };
function response() {
	return { id: "ORDER1", intent: "CAPTURE", status: "CREATED", purchase_units: [{ reference_id: input.basketId,
		custom_id: input.paymentId, amount: { currency_code: "USD", value: "5.97", breakdown: { item_total: { currency_code: "USD", value: "5.97" } } } }],
		payer: { email_address: "private@example.test" }, links: [{ rel: "approve", href: "https://not-exposed.example.test" }] };
}

describe("Sandbox Orders v2", () => {
	it("builds a server-priced, single-unit, no-shipping request without personal data", () => {
		const body = orderBody(input);
		expect(body).toMatchObject({ intent: "CAPTURE", purchase_units: [{ reference_id: input.basketId, custom_id: input.paymentId,
			amount: { currency_code: "USD", value: "5.97", breakdown: { item_total: { currency_code: "USD", value: "5.97" } } },
			items: [{ name: "Rice · 1 lb", sku: "rice", quantity: "3", unit_amount: { currency_code: "USD", value: "1.99" }, category: "PHYSICAL_GOODS" }] }],
			payment_source: { paypal: { experience_context: { shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW", brand_name: "CareBasket Demo Market" } } } });
		expect(JSON.stringify(body)).not.toMatch(/email|address|inputText|budget/);
	});
	it("reuses the persisted UUID for every create and returns only verified safe order fields", async () => {
		const client = { clientId: "fictional-sandbox-client", orderRequest: vi.fn().mockResolvedValue(response()) };
		const first = await createSandboxOrder(client, input);
		expect(await createSandboxOrder(client, input)).toEqual(first);
		for (const args of client.orderRequest.mock.calls) expect(args).toEqual(["/v2/checkout/orders", orderBody(input), input.paymentId]);
		expect(first).toEqual({ id: "ORDER1", status: "CREATED", hasPayments: false });
		expect(JSON.stringify(first)).not.toContain("private@example.test");
	});
	it.each(["custom_id", "reference_id", "currency", "amount", "breakdown", "id", "intent", "units"])("rejects a mismatched %s", (field) => {
		const body = response();
		if (field === "custom_id") body.purchase_units[0].custom_id = requestIds.other;
		if (field === "reference_id") body.purchase_units[0].reference_id = requestIds.other;
		if (field === "currency") body.purchase_units[0].amount.currency_code = "EUR";
		if (field === "amount") body.purchase_units[0].amount.value = "5.98";
		if (field === "breakdown") body.purchase_units[0].amount.breakdown.item_total.value = "5.00";
		if (field === "id") body.id = "wrong/id";
		if (field === "intent") body.intent = "AUTHORIZE";
		if (field === "units") body.purchase_units.push(body.purchase_units[0]);
		expect(() => verifyOrder(body, input)).toThrow();
	});
	it("verifies GET identity and refuses approved or payment-bearing orders for cancellation", async () => {
		const client = { clientId: "fictional-sandbox-client", orderRequest: vi.fn().mockResolvedValue({ ...response(), id: "ORDER2" }) };
		await expect(readSandboxOrder(client, input, "ORDER1")).rejects.toMatchObject({ kind: "INVALID_RESPONSE" });
		expect(client.orderRequest).toHaveBeenCalledWith("/v2/checkout/orders/ORDER1");
		expect(isUnapprovedOrder({ id: "ORDER1", status: "PAYER_ACTION_REQUIRED", hasPayments: false })).toBe(true);
		for (const status of ["APPROVED", "COMPLETED", "VOIDED", "SAVED"] as const) {
			expect(isUnapprovedOrder({ id: "ORDER1", status, hasPayments: false })).toBe(false);
		}
		expect(isUnapprovedOrder({ id: "ORDER1", status: "CREATED", hasPayments: true })).toBe(false);
		const captured = { ...response(), purchase_units: [{ ...response().purchase_units[0], payments: { captures: [{ secret: "discarded" }] } }] };
		expect(verifyOrder(captured, input).hasPayments).toBe(true);
	});
	it("enforces item/name/SKU/amount limits before making a provider call", () => {
		expect(() => orderBody({ ...input, amountMinor: 1 })).toThrow();
		expect(() => orderBody({ ...input, currency: "EUR" })).toThrow();
		for (const field of ["sku", "name"] as const) expect(() => orderBody({ ...input, items: [{ ...input.items[0], [field]: "x".repeat(128) }] })).toThrow();
	});
});
