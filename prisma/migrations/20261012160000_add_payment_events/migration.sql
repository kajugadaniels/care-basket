-- Developer-reviewable; the agent has not applied this migration.
ALTER TYPE "PaymentStatus" ADD VALUE 'REVERSED';
CREATE TYPE "PaymentEventSource" AS ENUM ('CAPTURE_RESPONSE', 'WEBHOOK', 'SYSTEM');
ALTER TABLE "Payment" ADD COLUMN "captureStartedAt" TIMESTAMPTZ(3);

CREATE TABLE "PaymentEvent" (
	"id" UUID NOT NULL,
	"paymentId" UUID,
	"source" "PaymentEventSource" NOT NULL,
	"paypalEventId" VARCHAR(80),
	"eventType" VARCHAR(100) NOT NULL,
	"resourceId" VARCHAR(36),
	"resourceStatus" VARCHAR(40),
	"amountMinor" INTEGER,
	"currency" CHAR(3),
	"summary" VARCHAR(40) NOT NULL,
	"verifiedAt" TIMESTAMPTZ(3),
	"receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"processedAt" TIMESTAMPTZ(3),
	CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id"),
	CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
	CONSTRAINT "PaymentEvent_nonnegative_amount" CHECK ("amountMinor" IS NULL OR "amountMinor" >= 0)
);
CREATE UNIQUE INDEX "PaymentEvent_paypalEventId_key" ON "PaymentEvent"("paypalEventId");
CREATE INDEX "PaymentEvent_paymentId_receivedAt_idx" ON "PaymentEvent"("paymentId", "receivedAt");
CREATE INDEX "PaymentEvent_source_processedAt_receivedAt_idx" ON "PaymentEvent"("source", "processedAt", "receivedAt");
-- Preserve Payment_one_open_per_basket and the existing unique order/capture indexes.
