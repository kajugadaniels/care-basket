// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const sql = readFileSync("prisma/migrations/20261012120000_add_sandbox_payments/migration.sql", "utf8");
const payment = schema.match(/model Payment \{([\s\S]*?)\n\}/)?.[1].replace(/\s+/g, " ");

describe("payment ownership, history and SQL guards", () => {
	it("binds the basket, request, family, and currency with one composite foreign key", () => {
		expect(payment).toContain("fields: [basketId, requestId, familyId, currency], references: [id, requestId, familyId, currency], onDelete: Cascade");
		expect(payment).toContain("fields: [requestId, familyId], references: [id, familyId], onDelete: Cascade");
		expect(payment).toContain("family Family @relation(fields: [familyId], references: [id], onDelete: Cascade)");
		expect(sql).toContain('REFERENCES "ShoppingBasket"("id", "requestId", "familyId", "currency")');
	});
	it("keeps VOIDED history while enforcing one CREATED/APPROVED/PENDING attempt", () => {
		expect(sql).toContain('CREATE UNIQUE INDEX "Payment_one_open_per_basket" ON "Payment"("basketId")');
		expect(sql).toContain(`WHERE "status" IN ('CREATED', 'APPROVED', 'PENDING')`);
		expect(payment).toContain("paypalOrderId String? @unique");
		expect(payment).toContain("paypalCaptureId String? @unique");
	});
	it("enforces positive integer USD amounts and complete worker leases", () => {
		expect(sql).toContain('CHECK ("amountMinor" > 0)');
		expect(sql).toContain(`CHECK ("currency" = 'USD')`);
		expect(sql).toContain('CHECK (("operationToken" IS NULL) = ("operationExpiresAt" IS NULL))');
		expect(sql).toContain('jsonb_array_length("orderItems") BETWEEN 1 AND 30');
		expect(payment).toContain("@default(uuid(7))");
		expect(payment).not.toMatch(/accessToken|payerEmail|payerName|shippingAddress/);
		expect(schema).not.toContain("model PaymentEvent");
	});
});
