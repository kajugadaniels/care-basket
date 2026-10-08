/*
  Warnings:

  - A unique constraint covering the columns `[id,familyId]` on the table `ManagedProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PairingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'EXPIRED');

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "familyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "DevicePairing" (
    "id" UUID NOT NULL,
    "codeHash" CHAR(64) NOT NULL,
    "activeCodeHash" CHAR(64),
    "secretHash" CHAR(64) NOT NULL,
    "status" "PairingStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "userAgentSummary" VARCHAR(80) NOT NULL,
    "label" VARCHAR(40),
    "familyId" UUID,
    "profileId" UUID,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DevicePairing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorizedDevice" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "userAgentSummary" VARCHAR(80) NOT NULL,
    "approvedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "revokedByUserId" UUID,

    CONSTRAINT "AuthorizedDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitCounter" (
    "key" VARCHAR(128) NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateIndex
CREATE UNIQUE INDEX "DevicePairing_activeCodeHash_key" ON "DevicePairing"("activeCodeHash");

-- CreateIndex
CREATE UNIQUE INDEX "DevicePairing_secretHash_key" ON "DevicePairing"("secretHash");

-- CreateIndex
CREATE INDEX "DevicePairing_codeHash_status_idx" ON "DevicePairing"("codeHash", "status");

-- CreateIndex
CREATE INDEX "DevicePairing_expiresAt_idx" ON "DevicePairing"("expiresAt");

-- CreateIndex
CREATE INDEX "DevicePairing_familyId_profileId_idx" ON "DevicePairing"("familyId", "profileId");

-- CreateIndex
CREATE INDEX "DevicePairing_profileId_familyId_idx" ON "DevicePairing"("profileId", "familyId");

-- CreateIndex
CREATE INDEX "DevicePairing_approvedByUserId_idx" ON "DevicePairing"("approvedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorizedDevice_tokenHash_key" ON "AuthorizedDevice"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthorizedDevice_familyId_id_idx" ON "AuthorizedDevice"("familyId", "id");

-- CreateIndex
CREATE INDEX "AuthorizedDevice_familyId_profileId_revokedAt_expiresAt_idx" ON "AuthorizedDevice"("familyId", "profileId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "AuthorizedDevice_profileId_familyId_idx" ON "AuthorizedDevice"("profileId", "familyId");

-- CreateIndex
CREATE INDEX "AuthorizedDevice_approvedByUserId_idx" ON "AuthorizedDevice"("approvedByUserId");

-- CreateIndex
CREATE INDEX "AuthorizedDevice_revokedByUserId_idx" ON "AuthorizedDevice"("revokedByUserId");

-- CreateIndex
CREATE INDEX "AuthorizedDevice_expiresAt_idx" ON "AuthorizedDevice"("expiresAt");

-- CreateIndex
CREATE INDEX "AuthorizedDevice_revokedAt_idx" ON "AuthorizedDevice"("revokedAt");

-- CreateIndex
CREATE INDEX "RateLimitCounter_expiresAt_idx" ON "RateLimitCounter"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManagedProfile_id_familyId_key" ON "ManagedProfile"("id", "familyId");

-- AddForeignKey
ALTER TABLE "DevicePairing" ADD CONSTRAINT "DevicePairing_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePairing" ADD CONSTRAINT "DevicePairing_profileId_familyId_fkey" FOREIGN KEY ("profileId", "familyId") REFERENCES "ManagedProfile"("id", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevicePairing" ADD CONSTRAINT "DevicePairing_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedDevice" ADD CONSTRAINT "AuthorizedDevice_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedDevice" ADD CONSTRAINT "AuthorizedDevice_profileId_familyId_fkey" FOREIGN KEY ("profileId", "familyId") REFERENCES "ManagedProfile"("id", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedDevice" ADD CONSTRAINT "AuthorizedDevice_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorizedDevice" ADD CONSTRAINT "AuthorizedDevice_revokedByUserId_fkey" FOREIGN KEY ("revokedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
