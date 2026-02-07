-- CreateEnum
CREATE TYPE "LicenseTier" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PENDING', 'TRIAL');

-- CreateTable
CREATE TABLE "license_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "tier" "LicenseTier" NOT NULL DEFAULT 'PROFESSIONAL',
    "priceMonthly" INTEGER,
    "priceYearly" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "defaultDurationDays" INTEGER NOT NULL DEFAULT 365,
    "trialDurationDays" INTEGER NOT NULL DEFAULT 14,
    "maxUsers" INTEGER,
    "maxConversations" INTEGER,
    "maxMeetings" INTEGER,
    "maxDocuments" INTEGER,
    "maxApiCalls" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_features" (
    "id" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requiresLicense" BOOLEAN NOT NULL DEFAULT true,
    "defaultLimit" INTEGER,
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_licenses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseTypeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "licenseKey" TEXT NOT NULL,
    "isTrial" BOOLEAN NOT NULL DEFAULT false,
    "trialEndDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "customLimits" JSONB,
    "notes" TEXT,
    "assignedBy" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_entitlements" (
    "id" TEXT NOT NULL,
    "userLicenseId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "usageLimit" INTEGER,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "usagePeriod" TEXT NOT NULL DEFAULT 'monthly',
    "periodResetAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "license_entitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_usage" (
    "id" TEXT NOT NULL,
    "userLicenseId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "usageDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedByName" TEXT,
    "performedByEmail" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LicenseFeatureToLicenseType" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "license_types_name_key" ON "license_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "license_types_slug_key" ON "license_types"("slug");

-- CreateIndex
CREATE INDEX "license_types_tier_idx" ON "license_types"("tier");

-- CreateIndex
CREATE INDEX "license_types_isActive_idx" ON "license_types"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "license_features_featureKey_key" ON "license_features"("featureKey");

-- CreateIndex
CREATE INDEX "license_features_category_idx" ON "license_features"("category");

-- CreateIndex
CREATE INDEX "license_features_featureKey_idx" ON "license_features"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "user_licenses_licenseKey_key" ON "user_licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "user_licenses_userId_idx" ON "user_licenses"("userId");

-- CreateIndex
CREATE INDEX "user_licenses_licenseTypeId_idx" ON "user_licenses"("licenseTypeId");

-- CreateIndex
CREATE INDEX "user_licenses_status_idx" ON "user_licenses"("status");

-- CreateIndex
CREATE INDEX "user_licenses_endDate_idx" ON "user_licenses"("endDate");

-- CreateIndex
CREATE INDEX "user_licenses_licenseKey_idx" ON "user_licenses"("licenseKey");

-- CreateIndex
CREATE UNIQUE INDEX "user_licenses_userId_licenseTypeId_key" ON "user_licenses"("userId", "licenseTypeId");

-- CreateIndex
CREATE INDEX "license_entitlements_userLicenseId_idx" ON "license_entitlements"("userLicenseId");

-- CreateIndex
CREATE INDEX "license_entitlements_featureId_idx" ON "license_entitlements"("featureId");

-- CreateIndex
CREATE UNIQUE INDEX "license_entitlements_userLicenseId_featureId_key" ON "license_entitlements"("userLicenseId", "featureId");

-- CreateIndex
CREATE INDEX "license_usage_userLicenseId_idx" ON "license_usage"("userLicenseId");

-- CreateIndex
CREATE INDEX "license_usage_featureKey_idx" ON "license_usage"("featureKey");

-- CreateIndex
CREATE INDEX "license_usage_usageDate_idx" ON "license_usage"("usageDate");

-- CreateIndex
CREATE INDEX "license_audit_logs_entityType_entityId_idx" ON "license_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "license_audit_logs_performedBy_idx" ON "license_audit_logs"("performedBy");

-- CreateIndex
CREATE INDEX "license_audit_logs_action_idx" ON "license_audit_logs"("action");

-- CreateIndex
CREATE INDEX "license_audit_logs_createdAt_idx" ON "license_audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_LicenseFeatureToLicenseType_AB_unique" ON "_LicenseFeatureToLicenseType"("A", "B");

-- CreateIndex
CREATE INDEX "_LicenseFeatureToLicenseType_B_index" ON "_LicenseFeatureToLicenseType"("B");

-- AddForeignKey
ALTER TABLE "user_licenses" ADD CONSTRAINT "user_licenses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_licenses" ADD CONSTRAINT "user_licenses_licenseTypeId_fkey" FOREIGN KEY ("licenseTypeId") REFERENCES "license_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_entitlements" ADD CONSTRAINT "license_entitlements_userLicenseId_fkey" FOREIGN KEY ("userLicenseId") REFERENCES "user_licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_entitlements" ADD CONSTRAINT "license_entitlements_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "license_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_usage" ADD CONSTRAINT "license_usage_userLicenseId_fkey" FOREIGN KEY ("userLicenseId") REFERENCES "user_licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LicenseFeatureToLicenseType" ADD CONSTRAINT "_LicenseFeatureToLicenseType_A_fkey" FOREIGN KEY ("A") REFERENCES "license_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LicenseFeatureToLicenseType" ADD CONSTRAINT "_LicenseFeatureToLicenseType_B_fkey" FOREIGN KEY ("B") REFERENCES "license_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
