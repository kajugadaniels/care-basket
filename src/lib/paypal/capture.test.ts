// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { approvedOrder, paymentAttempt, paymentOrder } from "@/test/factories/payments";
vi.mock("server-only", () => ({}));
import { captureIdFromLinks, verifyPayment, verifyReversal } from "./capture";
import { createPayPalClient } from "./client";

describe("verified Sandbox payment identity and amounts", () => {
	it("accepts exactly one completed final capture and discards payer details", () => {
		const result = verifyPayment(paymentOrder(), paymentAttempt());
		expect(result).toEqual({ status: "CAPTURED", captureId: "CAPTURE1", capturedAt: expect.any(Date) });
		expect(JSON.stringify(result)).not.toContain("never-persist");
	});
	it.each(["PENDING", "DENIED", "DECLINED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "REVERSED"])("handles verified %s without guessing success", (status) => {
		const result = verifyPayment(paymentOrder(paymentAttempt(), status), paymentAttempt());
		expect(result.status).toBe(status === "REVERSED" ? "REVERSED" : status === "PENDING" ? "PENDING" : status.includes("REFUNDED") ? "REFUNDED" : "DENIED");
	});
	it.each(["CREATED", "PAYER_ACTION_REQUIRED"])("allows safe refresh of an uncaptured %s order", (status) => {
		const order = approvedOrder(); order.status = status;
		expect(verifyPayment(order, paymentAttempt())).toEqual({ status: "CREATED", captureId: null, capturedAt: null });
		expect(() => verifyPayment(order, paymentAttempt({ paypalCaptureId: "CAPTURE1" }))).toThrow();
	});
	it("approval without a capture is not payment", () => {
		expect(verifyPayment(approvedOrder(), paymentAttempt())).toEqual({ status: "APPROVED", captureId: null, capturedAt: null });
	});
	it.each(["order", "intent", "basket", "custom", "order-amount", "capture-amount", "currency", "capture-currency",
		"missing", "ambiguous", "not-final", "capture-id", "order-status", "malformed", "empty-completed"])("rejects %s mismatch", (scenario) => {
		const order = paymentOrder(); const unit = order.purchase_units[0]; const capture = unit.payments.captures[0];
		if (scenario === "order") order.id = "OTHERORDER";
		if (scenario === "intent") order.intent = "AUTHORIZE";
		if (scenario === "basket") unit.reference_id = "0199a100-0000-7000-8000-000000000999";
		if (scenario === "custom") unit.custom_id = unit.reference_id;
		if (scenario === "order-amount") unit.amount.value = "4.99";
		if (scenario === "capture-amount") capture.amount.value = "4.99";
		if (scenario === "currency") unit.amount.currency_code = "EUR";
		if (scenario === "capture-currency") capture.amount.currency_code = "EUR";
		if (scenario === "missing" || scenario === "empty-completed") unit.payments.captures = [];
		if (scenario === "ambiguous") unit.payments.captures.push({ ...capture, id: "CAPTURE2" });
		if (scenario === "not-final") capture.final_capture = false;
		if (scenario === "capture-id") capture.id = "bad/id";
		if (scenario === "order-status") order.status = "APPROVED";
		if (scenario === "malformed") capture.amount.value = "NaN";
		expect(() => verifyPayment(order, paymentAttempt())).toThrow();
	});
	it("never substitutes a different capture once a capture ID is stored", () => {
		expect(() => verifyPayment(paymentOrder(), paymentAttempt({ paypalCaptureId: "OTHER" }))).toThrow();
	});
	it("extracts only fixed Sandbox capture relationships, never arbitrary URLs", () => {
		expect(captureIdFromLinks([{ rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE1" }])).toBe("CAPTURE1");
		for (const href of ["https://evil.invalid/v2/payments/captures/CAPTURE1", "http://localhost/CAPTURE1", "https://api-m.sandbox.paypal.com.evil.invalid/v2/payments/captures/CAPTURE1"]) {
			expect(captureIdFromLinks([{ rel: "up", href }])).toBeUndefined();
		}
	});
	it("verifies a partial refund through its capture and refund resource", async () => {
		const send = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ access_token: "fictional", token_type: "Bearer", expires_in: 120 }))
			.mockResolvedValueOnce(Response.json({ id: "CAPTURE1", status: "PARTIALLY_REFUNDED", amount: { currency_code: "USD", value: "5.00" },
				supplementary_data: { related_ids: { order_id: "ORDER1" } } }))
			.mockResolvedValueOnce(Response.json({ id: "REFUND1", status: "COMPLETED", amount: { currency_code: "USD", value: "1.00" },
				links: [{ rel: "up", href: "https://api-m.sandbox.paypal.com/v2/payments/captures/CAPTURE1" }] }));
		const client = createPayPalClient({ clientId: "fictional", clientSecret: "fictional" }, { fetch: send });
		await verifyReversal(client, paymentAttempt(), "CAPTURE1", "REFUND1", true);
		expect(send.mock.calls[2][0]).toBe("https://api-m.sandbox.paypal.com/v2/payments/refunds/REFUND1");
	});
	it.each(["relationship", "currency", "amount", "pending"])("rejects a refund with an invalid %s", async (scenario) => {
		const result = { id: "REFUND1", status: scenario === "pending" ? "PENDING" : "COMPLETED",
			amount: { currency_code: scenario === "currency" ? "EUR" : "USD", value: scenario === "amount" ? "6.00" : "1.00" },
			links: [{ rel: "up", href: `https://api-m.sandbox.paypal.com/v2/payments/captures/${scenario === "relationship" ? "OTHER" : "CAPTURE1"}` }] };
		const send = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ access_token: "fictional", token_type: "Bearer", expires_in: 120 }))
			.mockResolvedValueOnce(Response.json({ id: "CAPTURE1", status: "REFUNDED", amount: { currency_code: "USD", value: "5.00" },
				supplementary_data: { related_ids: { order_id: "ORDER1" } } })).mockResolvedValueOnce(Response.json(result));
		await expect(verifyReversal(createPayPalClient({ clientId: "fictional", clientSecret: "fictional" }, { fetch: send }),
			paymentAttempt(), "CAPTURE1", "REFUND1", true)).rejects.toThrow();
	});
});
