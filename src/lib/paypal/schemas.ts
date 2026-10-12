import "server-only";
import { z } from "zod";
import { MAX_USD_MINOR, usdMinor } from "@/lib/money";

export const orderIdSchema = z.string().min(1).max(36).regex(/^[A-Z0-9]+$/);
export const orderItemsSchema = z.array(z.strictObject({
	name: z.string().trim().min(1).max(127),
	sku: z.string().min(1).max(127),
	quantity: z.int().min(1).max(20),
	unitPriceMinor: z.int().positive().max(MAX_USD_MINOR),
})).min(1).max(30).refine((items) => new Set(items.map((item) => item.sku)).size === items.length);
export type OrderItems = z.infer<typeof orderItemsSchema>;
export type OrderInput = { paymentId: string; basketId: string; amountMinor: number; currency: string; items: OrderItems };

const amountSchema = z.object({
	currency_code: z.literal("USD"),
	value: z.string().refine((value) => {
		try { return usdMinor(value) > 0; } catch { return false; }
	}),
});

// Zod strips unused fields, including all payer details and approval links.
export const orderResponseSchema = z.object({
	id: orderIdSchema,
	intent: z.literal("CAPTURE"),
	status: z.enum(["CREATED", "SAVED", "APPROVED", "VOIDED", "COMPLETED", "PAYER_ACTION_REQUIRED"]),
	purchase_units: z.array(z.object({
		reference_id: z.uuid(),
		custom_id: z.uuid(),
		amount: amountSchema.extend({ breakdown: z.object({ item_total: amountSchema }).optional() }),
		// Preserve existence, not personal/transaction details, to prevent unsafe cancellation.
		payments: z.strictObject({
			captures: z.array(z.unknown()).optional(),
			authorizations: z.array(z.unknown()).optional(),
			refunds: z.array(z.unknown()).optional(),
		}).optional(),
	})).length(1),
});
export type PayPalOrder = { id: string; status: z.infer<typeof orderResponseSchema>["status"]; hasPayments: boolean };
