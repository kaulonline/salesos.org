-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('EXPORT', 'DELETION', 'RECTIFICATION');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "data_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DataRequestType" NOT NULL,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "downloadUrl" TEXT,
    "downloadExpiresAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "privacy_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analyticsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "personalizationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "crashReportingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiTrainingConsent" BOOLEAN NOT NULL DEFAULT false,
    "contextRetentionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmailsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "productUpdatesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "retentionPeriodDays" INTEGER,
    "lastConsentUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentVersion" TEXT NOT NULL DEFAULT '1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_requests_userId_idx" ON "data_requests"("userId");

-- CreateIndex
CREATE INDEX "data_requests_type_idx" ON "data_requests"("type");

-- CreateIndex
CREATE INDEX "data_requests_status_idx" ON "data_requests"("status");

-- CreateIndex
CREATE INDEX "data_requests_createdAt_idx" ON "data_requests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "privacy_preferences_userId_key" ON "privacy_preferences"("userId");

-- CreateIndex
CREATE INDEX "privacy_preferences_userId_idx" ON "privacy_preferences"("userId");
