/*
  Warnings:

  - A unique constraint covering the columns `[id,profileId,familyId]` on the table `AuthorizedDevice` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "AssistantReview" (
    "id" UUID NOT NULL,
    "reviewId" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "deviceId" UUID NOT NULL,
    "payload" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssistantReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssistantReview_reviewId_key" ON "AssistantReview"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantReview_deviceId_key" ON "AssistantReview"("deviceId");

-- CreateIndex
CREATE INDEX "AssistantReview_familyId_expiresAt_id_idx" ON "AssistantReview"("familyId", "expiresAt", "id");

-- CreateIndex
CREATE INDEX "AssistantReview_profileId_familyId_idx" ON "AssistantReview"("profileId", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "AssistantReview_deviceId_profileId_familyId_key" ON "AssistantReview"("deviceId", "profileId", "familyId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorizedDevice_id_profileId_familyId_key" ON "AuthorizedDevice"("id", "profileId", "familyId");

-- AddForeignKey
ALTER TABLE "AssistantReview" ADD CONSTRAINT "AssistantReview_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantReview" ADD CONSTRAINT "AssistantReview_profileId_familyId_fkey" FOREIGN KEY ("profileId", "familyId") REFERENCES "ManagedProfile"("id", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantReview" ADD CONSTRAINT "AssistantReview_deviceId_profileId_familyId_fkey" FOREIGN KEY ("deviceId", "profileId", "familyId") REFERENCES "AuthorizedDevice"("id", "profileId", "familyId") ON DELETE CASCADE ON UPDATE CASCADE;
