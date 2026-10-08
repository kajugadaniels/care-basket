-- CreateEnum
CREATE TYPE "ProfileKind" AS ENUM ('ASSISTED_ADULT', 'CHILD');

-- CreateTable
CREATE TABLE "ManagedProfile" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "displayName" VARCHAR(40) NOT NULL,
    "kind" "ProfileKind" NOT NULL,
    "avatarKey" VARCHAR(30) NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en-US',
    "consentConfirmedAt" TIMESTAMPTZ(3) NOT NULL,
    "consentVersion" VARCHAR(20) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "aiAssistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiConsentConfirmedAt" TIMESTAMPTZ(3),
    "aiConsentVersion" VARCHAR(20),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ManagedProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "actorType" VARCHAR(20) NOT NULL,
    "actorId" UUID NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "targetType" VARCHAR(40) NOT NULL,
    "targetId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManagedProfile_familyId_id_idx" ON "ManagedProfile"("familyId", "id");

-- CreateIndex
CREATE INDEX "ManagedProfile_createdByUserId_idx" ON "ManagedProfile"("createdByUserId");

-- CreateIndex
CREATE INDEX "AuditLog_familyId_createdAt_idx" ON "AuditLog"("familyId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManagedProfile" ADD CONSTRAINT "ManagedProfile_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagedProfile" ADD CONSTRAINT "ManagedProfile_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
