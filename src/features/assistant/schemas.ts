import { z } from "zod";
export const reviewPageSchema = z.strictObject({
	reviewId: z.uuid(),
	offset: z.int().min(0).max(192).multipleOf(12).default(0),
});
export const textRequestSchema = z.strictObject({
	text: z.string().trim().min(1).max(500).regex(/^[^\p{Cc}\p{Cf}<>]*$/u),
});
export const aiPreferenceSchema = z.strictObject({ profileId: z.uuid(), enabled: z.boolean(), consent: z.boolean() })
	.refine((input) => !input.enabled || input.consent, "Confirm consent separately.");
