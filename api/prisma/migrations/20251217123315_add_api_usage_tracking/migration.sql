-- CreateEnum
CREATE TYPE "ApiServiceType" AS ENUM ('LLM_CLAUDE', 'LLM_OPENAI', 'LLM_AZURE', 'SALESFORCE', 'HUBSPOT', 'GOOGLE_SEARCH', 'DOCUMENT_AI', 'MEETING_BOT', 'EMAIL_SERVICE', 'OTHER');

-- CreateTable
CREATE TABLE "api_usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userEmail" TEXT,
    "serviceType" "ApiServiceType" NOT NULL,
    "serviceName" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "inputCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outputCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apiCalls" INTEGER NOT NULL DEFAULT 1,
    "latencyMs" INTEGER,
    "requestId" TEXT,
    "conversationId" TEXT,
    "sessionId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_usage_summaries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userEmail" TEXT,
    "serviceType" "ApiServiceType" NOT NULL,
    "date" DATE NOT NULL,
    "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalApiCalls" INTEGER NOT NULL DEFAULT 0,
    "avgLatencyMs" DOUBLE PRECISION,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_usage_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_usage_logs_userId_idx" ON "api_usage_logs"("userId");

-- CreateIndex
CREATE INDEX "api_usage_logs_serviceType_idx" ON "api_usage_logs"("serviceType");

-- CreateIndex
CREATE INDEX "api_usage_logs_serviceName_idx" ON "api_usage_logs"("serviceName");

-- CreateIndex
CREATE INDEX "api_usage_logs_createdAt_idx" ON "api_usage_logs"("createdAt");

-- CreateIndex
CREATE INDEX "api_usage_logs_userId_serviceType_idx" ON "api_usage_logs"("userId", "serviceType");

-- CreateIndex
CREATE INDEX "api_usage_logs_userId_createdAt_idx" ON "api_usage_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "api_usage_summaries_userId_idx" ON "api_usage_summaries"("userId");

-- CreateIndex
CREATE INDEX "api_usage_summaries_serviceType_idx" ON "api_usage_summaries"("serviceType");

-- CreateIndex
CREATE INDEX "api_usage_summaries_date_idx" ON "api_usage_summaries"("date");

-- CreateIndex
CREATE INDEX "api_usage_summaries_userId_date_idx" ON "api_usage_summaries"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "api_usage_summaries_userId_serviceType_date_key" ON "api_usage_summaries"("userId", "serviceType", "date");
