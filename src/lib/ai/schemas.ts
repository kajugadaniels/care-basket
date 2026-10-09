import { z } from "zod";

const text = (max: number) => z.string().max(max).regex(/^[^\p{Cc}\p{Cf}<>]*$/u);
export const unitSchema = z.enum(["count", "pack", "dozen", "g", "kg", "oz", "lb", "ml", "l", "fl_oz", "qt", "gal"]);
export const interpretationSchema = z.strictObject({
	transcript: text(1000).nullable(),
	intent: z.enum(["list", "occasion", "mixed", "not_shopping"]),
	items: z.array(z.strictObject({
		sku: text(60).nullable(), requestedText: text(80),
		origin: z.enum(["requested", "suggested"]),
		amount: z.number().positive().max(100).nullable(), unit: unitSchema.nullable(),
		packCount: z.int().min(1).max(20).nullable(),
		priority: z.enum(["essential", "optional"]), confidence: z.enum(["high", "medium", "low"]),
		substitutionReason: text(120).nullable(),
	})).max(30),
	occasion: z.strictObject({ summary: text(80), people: z.int().min(1).max(20).nullable() }).nullable(),
	statedBudget: z.strictObject({ amount: z.number().positive().max(1000), currency: z.literal("USD") }).nullable(),
	clarification: z.strictObject({ question: text(100), optionSkus: z.array(text(60)).min(2).max(4) }).nullable(),
	unrecognized: z.array(text(80)).max(10),
});
export type Interpretation = z.infer<typeof interpretationSchema>;
export type ShoppingUnit = z.infer<typeof unitSchema>;
