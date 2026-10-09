import { z } from "zod";
import { interpretationSchema } from "./schemas";

// Gemini implements a JSON Schema subset. Full length, control-character and
// positive-number validation remains authoritative in the feature service.
export function shoppingResponseJsonSchema() {
	const schema = z.toJSONSchema(interpretationSchema, {
		override: ({ jsonSchema }) => {
			delete jsonSchema.pattern;
			delete jsonSchema.minLength;
			delete jsonSchema.maxLength;
			if (jsonSchema.const !== undefined) {
				jsonSchema.enum = [jsonSchema.const];
				delete jsonSchema.const;
			}
			if (typeof jsonSchema.exclusiveMinimum === "number") {
				jsonSchema.minimum = jsonSchema.exclusiveMinimum;
				delete jsonSchema.exclusiveMinimum;
			}
			const choices = jsonSchema.anyOf;
			if (choices?.length === 2) {
				const nullable = choices.some((choice) => typeof choice === "object" && choice.type === "null");
				const value = choices.find((choice) => typeof choice === "object" && choice.type !== "null");
				if (nullable && typeof value === "object" && typeof value.type === "string") {
					delete jsonSchema.anyOf;
					Object.assign(jsonSchema, value, { type: [value.type, "null"] });
				}
			}
		},
	});
	delete schema.$schema;
	return schema;
}
