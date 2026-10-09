// @vitest-environment node
import { describe, expect, it } from "vitest";
import { shoppingResponseJsonSchema } from "./response-schema";
import { interpretationSchema } from "./schemas";
import { interpretation } from "@/test/factories/assistant";
describe("Gemini JSON Schema subset", () => {
	it("derives structured constraints without unsupported regex, string lengths or constants", () => {
		const schema = shoppingResponseJsonSchema();
		expect(schema.type).toBe("object");
		const encoded = JSON.stringify(schema);
		for (const keyword of ["pattern", "maxLength", "minLength", "exclusiveMinimum", "$schema", "const"])
			expect(encoded).not.toContain(`"${keyword}"`);
		expect(encoded).toContain('"maxItems":30'); expect(encoded).toContain('"USD"');
	});
	it("does not weaken authoritative Zod validation", () => {
		const raw = interpretation({ transcript: "<script>" });
		expect(interpretationSchema.safeParse(raw).success).toBe(false);
	});
});
