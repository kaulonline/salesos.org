-- CreateTable
CREATE TABLE "SalesforceConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instanceUrl" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "isSandbox" BOOLEAN NOT NULL DEFAULT false,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "syncSettings" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesforceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesforceConnection_userId_key" ON "SalesforceConnection"("userId");

-- CreateIndex
CREATE INDEX "SalesforceConnection_orgId_idx" ON "SalesforceConnection"("orgId");

-- AddForeignKey
ALTER TABLE "SalesforceConnection" ADD CONSTRAINT "SalesforceConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
