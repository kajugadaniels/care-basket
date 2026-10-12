-- Developer-reviewable migration; not applied by the agent.
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'APPROVED', 'PENDING', 'CAPTURED', 'DENIED', 'VOIDED', 'REFUNDED');

CREATE UNIQUE INDEX "ShoppingBasket_id_requestId_familyId_currency_key"
	ON "ShoppingBasket"("id", "requestId", "familyId", "currency");

CREATE TABLE "Payment" (
	"id" UUID NOT NULL,
	"familyId" UUID NOT NULL,
	"requestId" UUID NOT NULL,
	"basketId" UUID NOT NULL,
	"status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
	"amountMinor" INTEGER NOT NULL,
	"currency" CHAR(3) NOT NULL,
	"paypalOrderId" VARCHAR(36),
	"paypalCaptureId" VARCHAR(36),
	"paypalClientId" VARCHAR(256) NOT NULL,
	"initiatedByUserId" UUID NOT NULL,
	"capturedAt" TIMESTAMPTZ(3),
	"orderItems" JSONB NOT NULL,
	"creationStartedAt" TIMESTAMPTZ(3),
	"operationToken" UUID,
	"operationExpiresAt" TIMESTAMPTZ(3),
	"createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMPTZ(3) NOT NULL,
	CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
	-- Postgres INTEGER bounds the maximum; zero/negative orders are never payable.
	CONSTRAINT "Payment_positive_amount" CHECK ("amountMinor" > 0),
	CONSTRAINT "Payment_usd_only" CHECK ("currency" = 'USD'),
	-- A partial lease could otherwise permit an unsafe concurrent worker.
	CONSTRAINT "Payment_complete_lease" CHECK (("operationToken" IS NULL) = ("operationExpiresAt" IS NULL)),
	CONSTRAINT "Payment_catalog_lines" CHECK (jsonb_typeof("orderItems") = 'array'
		AND jsonb_array_length("orderItems") BETWEEN 1 AND 30)
);

CREATE UNIQUE INDEX "Payment_paypalOrderId_key" ON "Payment"("paypalOrderId");
CREATE UNIQUE INDEX "Payment_paypalCaptureId_key" ON "Payment"("paypalCaptureId");
-- History remains retryable after VOIDED/DENIED, but never has two open attempts.
-- Prisma cannot represent this predicate: retain it in all subsequent migrations.
CREATE UNIQUE INDEX "Payment_one_open_per_basket" ON "Payment"("basketId")
	WHERE "status" IN ('CREATED', 'APPROVED', 'PENDING');
CREATE INDEX "Payment_familyId_requestId_createdAt_idx" ON "Payment"("familyId", "requestId", "createdAt");
CREATE INDEX "Payment_requestId_familyId_idx" ON "Payment"("requestId", "familyId");
CREATE INDEX "Payment_basketId_requestId_familyId_currency_idx" ON "Payment"("basketId", "requestId", "familyId", "currency");
CREATE INDEX "Payment_initiatedByUserId_idx" ON "Payment"("initiatedByUserId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_familyId_fkey"
	FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_requestId_familyId_fkey"
	FOREIGN KEY ("requestId", "familyId") REFERENCES "ShoppingRequest"("id", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;
-- This composite FK prevents a payment targeting another request's basket or currency.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_basketId_requestId_familyId_currency_fkey"
	FOREIGN KEY ("basketId", "requestId", "familyId", "currency")
	REFERENCES "ShoppingBasket"("id", "requestId", "familyId", "currency") ON DELETE CASCADE ON UPDATE CASCADE;
-- Family/profile deletion cascades through requests; adult deletion follows existing creator restrictions.
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_initiatedByUserId_fkey"
	FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
