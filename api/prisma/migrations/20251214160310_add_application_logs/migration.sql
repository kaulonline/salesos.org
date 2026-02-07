-- CreateTable
CREATE TABLE "application_logs" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "code" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "requestId" TEXT,
    "correlationId" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "duration" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "errorType" TEXT,
    "stackTrace" TEXT,
    "transactionType" TEXT,
    "transactionId" TEXT,
    "transactionStatus" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "tags" TEXT[],
    "environment" TEXT,
    "serverInstance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_logs_level_idx" ON "application_logs"("level");

-- CreateIndex
CREATE INDEX "application_logs_category_idx" ON "application_logs"("category");

-- CreateIndex
CREATE INDEX "application_logs_source_idx" ON "application_logs"("source");

-- CreateIndex
CREATE INDEX "application_logs_userId_idx" ON "application_logs"("userId");

-- CreateIndex
CREATE INDEX "application_logs_requestId_idx" ON "application_logs"("requestId");

-- CreateIndex
CREATE INDEX "application_logs_correlationId_idx" ON "application_logs"("correlationId");

-- CreateIndex
CREATE INDEX "application_logs_transactionType_idx" ON "application_logs"("transactionType");

-- CreateIndex
CREATE INDEX "application_logs_transactionStatus_idx" ON "application_logs"("transactionStatus");

-- CreateIndex
CREATE INDEX "application_logs_entityType_entityId_idx" ON "application_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "application_logs_createdAt_idx" ON "application_logs"("createdAt");

-- CreateIndex
CREATE INDEX "application_logs_tags_idx" ON "application_logs"("tags");
