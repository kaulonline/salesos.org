-- CreateEnum
CREATE TYPE "CrmProvider" AS ENUM ('SALESFORCE', 'HUBSPOT', 'DYNAMICS365', 'ZOHO', 'PIPEDRIVE', 'CUSTOM');

-- CreateTable
CREATE TABLE "CrmIntegration" (
    "id" TEXT NOT NULL,
    "provider" "CrmProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isConfigured" BOOLEAN NOT NULL DEFAULT false,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "callbackUrl" TEXT,
    "loginUrl" TEXT,
    "apiVersion" TEXT,
    "config" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "instanceUrl" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "externalOrgId" TEXT,
    "externalUserId" TEXT,
    "username" TEXT,
    "displayName" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSandbox" BOOLEAN NOT NULL DEFAULT false,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "syncSettings" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrmConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmIntegration_provider_key" ON "CrmIntegration"("provider");

-- CreateIndex
CREATE INDEX "CrmIntegration_provider_idx" ON "CrmIntegration"("provider");

-- CreateIndex
CREATE INDEX "CrmIntegration_isEnabled_idx" ON "CrmIntegration"("isEnabled");

-- CreateIndex
CREATE INDEX "CrmConnection_integrationId_idx" ON "CrmConnection"("integrationId");

-- CreateIndex
CREATE INDEX "CrmConnection_externalOrgId_idx" ON "CrmConnection"("externalOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmConnection_userId_integrationId_key" ON "CrmConnection"("userId", "integrationId");

-- AddForeignKey
ALTER TABLE "CrmConnection" ADD CONSTRAINT "CrmConnection_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "CrmIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
