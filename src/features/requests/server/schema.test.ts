// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
function model(name: string) {
	const value = schema.match(new RegExp(`model ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1];
	if (!value) throw new Error(`Missing model: ${name}`);
	return value.replace(/\s+/g, " ");
}
describe("shopping ownership and deletion schema", () => {
	it("cascades requests from profiles and families, then baskets and items", () => {
		expect(model("ShoppingRequest")).toContain("profile ManagedProfile @relation(fields: [profileId, familyId], references: [id, familyId], onDelete: Cascade)");
		expect(model("ShoppingRequest")).toContain("family Family @relation(fields: [familyId], references: [id], onDelete: Cascade)");
		expect(model("ShoppingBasket")).toContain("request ShoppingRequest @relation(fields: [requestId, familyId], references: [id, familyId], onDelete: Cascade)");
		expect(model("BasketItem")).toContain("basket ShoppingBasket @relation(fields: [basketId], references: [id], onDelete: Cascade)");
	});
	it("preserves history on device deletion and restricts referenced product deletion", () => {
		expect(model("ShoppingRequest")).toContain("device AuthorizedDevice? @relation(fields: [deviceId], references: [id], onDelete: SetNull)");
		expect(model("BasketItem")).toContain("product CatalogProduct @relation(fields: [productId], references: [id], onDelete: Restrict)");
	});
	it("enforces unique submissions and item identities with a concurrency revision", () => {
		expect(model("ShoppingRequest")).toContain("@@unique([profileId, clientRequestKey])");
		expect(model("ShoppingRequest")).toContain("revision Int @default(0)");
		expect(model("BasketItem")).toContain("@@unique([basketId, productId])");
	});
});
