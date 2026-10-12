import { describe, expect, it } from "vitest";
import { requestIds } from "@/test/factories/requests";
import { cancelCheckoutSchema, startCheckoutSchema } from "./schemas";

const input = { requestId: requestIds.request, revision: 0 };
describe("checkout input boundaries", () => {
	it("accepts only request identity/revision and deliberate cancellation", () => {
		expect(startCheckoutSchema.parse(input)).toEqual(input);
		expect(cancelCheckoutSchema.safeParse({ ...input, paymentId: requestIds.key, confirmed: true }).success).toBe(true);
		expect(cancelCheckoutSchema.safeParse({ ...input, paymentId: requestIds.key }).success).toBe(false);
	});
	it.each(["amountMinor", "currency", "items", "userId", "familyId", "profileId", "paypalOrderId"])("rejects client-controlled %s", (field) => {
		expect(startCheckoutSchema.safeParse({ ...input, [field]: "forged" }).success).toBe(false);
	});
	it.each([{ requestId: "invalid" }, { revision: -1 }, { revision: 0.5 }, { revision: 2_147_483_647 }])("rejects invalid identifiers or revisions", (change) => {
		expect(startCheckoutSchema.safeParse({ ...input, ...change }).success).toBe(false);
	});
});
