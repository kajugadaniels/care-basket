import { z } from "zod";

export const startCheckoutSchema = z.strictObject({
	requestId: z.uuid(), revision: z.int().min(0).max(2_147_483_646),
});
export const cancelCheckoutSchema = startCheckoutSchema.extend({ paymentId: z.uuid(), confirmed: z.literal(true) });
export type StartCheckoutInput = z.infer<typeof startCheckoutSchema>;
export type CancelCheckoutInput = z.infer<typeof cancelCheckoutSchema>;
