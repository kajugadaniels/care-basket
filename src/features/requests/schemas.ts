import { z } from "zod";
import { MAX_ITEM_QUANTITY, MAX_REQUEST_ITEMS, REQUEST_STATUSES } from "./limits";

export const quantitySchema = z.number().int().min(1).max(MAX_ITEM_QUANTITY);
export const requestItemSchema = z.strictObject({
	sku: z.string().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	quantity: quantitySchema,
});
export const submitRequestSchema = z.strictObject({
	clientRequestKey: z.uuid(),
	inputMode: z.literal("PICTURES"),
	items: z.array(requestItemSchema).min(1).max(MAX_REQUEST_ITEMS)
		.refine((items) => new Set(items.map((item) => item.sku)).size === items.length, "Remove duplicate products."),
});
const revisionFields = { requestId: z.uuid(), revision: z.number().int().min(0).max(2_147_483_646) };
export const updateRequestItemSchema = z.strictObject({ ...revisionFields, itemId: z.uuid(), quantity: quantitySchema });
export const removeRequestItemSchema = z.strictObject({ ...revisionFields, itemId: z.uuid() });
export const closeRequestSchema = z.strictObject({ ...revisionFields, confirmed: z.literal(true) });
export const requestListSchema = z.strictObject({
	after: z.uuid().optional(), status: z.enum(REQUEST_STATUSES).optional(),
});
export type SubmitRequestInput = z.infer<typeof submitRequestSchema>;
export type UpdateRequestItemInput = z.infer<typeof updateRequestItemSchema>;
export type RemoveRequestItemInput = z.infer<typeof removeRequestItemSchema>;
export type CloseRequestInput = z.infer<typeof closeRequestSchema>;
export type RequestListInput = z.infer<typeof requestListSchema>;
