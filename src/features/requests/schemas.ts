import { z } from "zod";
import { MAX_ITEM_QUANTITY, MAX_REQUEST_ITEMS, REQUEST_STATUSES } from "./limits";

export const quantitySchema = z.number().int().min(1).max(MAX_ITEM_QUANTITY);
export const requestItemSchema = z.strictObject({
	sku: z.string().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	quantity: quantitySchema,
	origin: z.enum(["REQUESTED", "SUGGESTED"]).optional(),
	isSubstitute: z.boolean().optional(),
	substitutionNote: z.string().max(120).regex(/^[^\p{Cc}\p{Cf}<>]*$/u).nullable().optional(),
	proof: z.string().max(16_000).optional(),
});
export const submitRequestSchema = z.strictObject({
	clientRequestKey: z.uuid(),
	inputMode: z.enum(["PICTURES", "TEXT", "VOICE"]),
	inputText: z.string().trim().max(1000).regex(/^[^\p{Cc}\p{Cf}<>]*$/u).optional(),
	budgetMinor: z.int().min(100).max(50_000).optional(),
	budgetConfirmed: z.literal(true).optional(),
	sourceProof: z.string().max(16_000).optional(),
	items: z.array(requestItemSchema).min(1).max(MAX_REQUEST_ITEMS)
		.refine((items) => new Set(items.map((item) => item.sku)).size === items.length, "Remove duplicate products."),
}).refine((input) => input.budgetMinor === undefined || input.budgetConfirmed === true, "Confirm the budget.")
	.refine((input) => input.inputMode === "PICTURES" || !!input.inputText, "Include the original request.")
	.refine((input) => input.inputMode !== "TEXT" || (input.inputText?.length ?? 0) <= 500, "Keep the text short.");
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
