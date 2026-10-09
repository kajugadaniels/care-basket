import { z } from "zod";

const plain = (max: number) => z.string().trim().min(1).max(max).regex(/^[^\p{Cc}\p{Cf}<>]*$/u);
// Prices and family/profile fields cannot enter this strict provider context.
export const catalogContextSchema = z.strictObject({
	sku: z.string().max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), name: plain(160),
	category: z.string().max(40).regex(/^[A-Z_]+$/), sizeLabel: plain(100), variantGroup: plain(100),
	synonyms: z.array(plain(100)).max(20),
});
