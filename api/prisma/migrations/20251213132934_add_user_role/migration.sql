-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'USER', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "meeting_insights" ADD COLUMN     "impactedEntity" TEXT,
ADD COLUMN     "impactedEntityId" TEXT,
ADD COLUMN     "suggestedAction" TEXT;

-- CreateTable
CREATE TABLE "crm_audit_logs" (
    "id" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "meetingSessionId" TEXT,
    "userId" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "isSecret" BOOLEAN NOT NULL DEFAULT false,
    "validation" JSONB,
    "defaultValue" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
    "allowedRoles" TEXT[],
    "allowedUsers" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userEmail" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_configs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "credentials" JSONB,
    "settings" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_audit_logs_entityType_entityId_idx" ON "crm_audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "crm_audit_logs_meetingSessionId_idx" ON "crm_audit_logs"("meetingSessionId");

-- CreateIndex
CREATE INDEX "crm_audit_logs_changeType_idx" ON "crm_audit_logs"("changeType");

-- CreateIndex
CREATE INDEX "crm_audit_logs_createdAt_idx" ON "crm_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "crm_audit_logs_source_idx" ON "crm_audit_logs"("source");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "system_configs_category_idx" ON "system_configs"("category");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_category_idx" ON "feature_flags"("category");

-- CreateIndex
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags"("enabled");

-- CreateIndex
CREATE INDEX "admin_audit_logs_userId_idx" ON "admin_audit_logs"("userId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_entityType_idx" ON "admin_audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "admin_audit_logs_timestamp_idx" ON "admin_audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "integration_configs_provider_key" ON "integration_configs"("provider");

-- CreateIndex
CREATE INDEX "meeting_insights_impactedEntity_impactedEntityId_idx" ON "meeting_insights"("impactedEntity", "impactedEntityId");
