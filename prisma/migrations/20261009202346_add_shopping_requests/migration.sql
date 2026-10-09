-- CreateEnum
CREATE TYPE "InputMode" AS ENUM ('PICTURES', 'TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING_REVIEW', 'AWAITING_PAYMENT', 'PAID', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('NOT_STARTED', 'PREPARING', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ItemOrigin" AS ENUM ('REQUESTED', 'SUGGESTED');

-- CreateTable
CREATE TABLE "ShoppingRequest" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "deviceId" UUID,
    "clientRequestKey" UUID NOT NULL,
    "submissionHash" CHAR(64) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "inputMode" "InputMode" NOT NULL,
    "inputText" VARCHAR(1000),
    "budgetMinor" INTEGER,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ShoppingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingBasket" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "subtotalMinor" INTEGER NOT NULL,
    "lockedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ShoppingBasket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasketItem" (
    "id" UUID NOT NULL,
    "basketId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "origin" "ItemOrigin" NOT NULL DEFAULT 'REQUESTED',
    "isSubstitute" BOOLEAN NOT NULL DEFAULT false,
    "substitutionNote" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BasketItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShoppingRequest_familyId_status_id_idx" ON "ShoppingRequest"("familyId", "status", "id");

-- CreateIndex
CREATE INDEX "ShoppingRequest_profileId_familyId_id_idx" ON "ShoppingRequest"("profileId", "familyId", "id");

-- CreateIndex
CREATE INDEX "ShoppingRequest_deviceId_idx" ON "ShoppingRequest"("deviceId");

-- CreateIndex
CREATE INDEX "ShoppingRequest_reviewedByUserId_idx" ON "ShoppingRequest"("reviewedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingRequest_profileId_clientRequestKey_key" ON "ShoppingRequest"("profileId", "clientRequestKey");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingRequest_id_familyId_key" ON "ShoppingRequest"("id", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingBasket_requestId_key" ON "ShoppingBasket"("requestId");

-- CreateIndex
CREATE INDEX "ShoppingBasket_familyId_idx" ON "ShoppingBasket"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingBasket_requestId_familyId_key" ON "ShoppingBasket"("requestId", "familyId");

-- CreateIndex
CREATE INDEX "BasketItem_productId_idx" ON "BasketItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "BasketItem_basketId_productId_key" ON "BasketItem"("basketId", "productId");

-- AddForeignKey
ALTER TABLE "ShoppingRequest" ADD CONSTRAINT "ShoppingRequest_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingRequest" ADD CONSTRAINT "ShoppingRequest_profileId_familyId_fkey" FOREIGN KEY ("profileId", "familyId") REFERENCES "ManagedProfile"("id", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingRequest" ADD CONSTRAINT "ShoppingRequest_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "AuthorizedDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingRequest" ADD CONSTRAINT "ShoppingRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingBasket" ADD CONSTRAINT "ShoppingBasket_requestId_familyId_fkey" FOREIGN KEY ("requestId", "familyId") REFERENCES "ShoppingRequest"("id", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingBasket" ADD CONSTRAINT "ShoppingBasket_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "ShoppingBasket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
