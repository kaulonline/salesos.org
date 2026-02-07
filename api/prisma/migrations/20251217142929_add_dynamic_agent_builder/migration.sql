-- CreateTable
CREATE TABLE "agent_definitions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "icon" TEXT,
    "color" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "systemPrompt" TEXT NOT NULL,
    "analysisPrompt" TEXT,
    "outputFormat" TEXT,
    "modelId" TEXT NOT NULL DEFAULT 'claude-sonnet',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "maxTokens" INTEGER NOT NULL DEFAULT 4000,
    "enabledTools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customTools" JSONB,
    "triggerConfig" JSONB,
    "maxExecutionTimeMs" INTEGER NOT NULL DEFAULT 60000,
    "maxLLMCalls" INTEGER NOT NULL DEFAULT 10,
    "maxAlertsPerRun" INTEGER NOT NULL DEFAULT 20,
    "rateLimitPerHour" INTEGER NOT NULL DEFAULT 10,
    "rateLimitPerDay" INTEGER NOT NULL DEFAULT 100,
    "targetEntityTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetFilters" JSONB,
    "alertTypes" TEXT[] DEFAULT ARRAY['INFORMATION']::TEXT[],
    "actionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "organizationId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "agent_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_versions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "configSnapshot" JSONB NOT NULL,
    "changeNotes" TEXT,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_definition_executions" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "scope" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "executionTimeMs" INTEGER,
    "llmCalls" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "alertsCreated" INTEGER NOT NULL DEFAULT 0,
    "actionsCreated" INTEGER NOT NULL DEFAULT 0,
    "insightsFound" INTEGER NOT NULL DEFAULT 0,
    "resultSummary" TEXT,
    "resultData" JSONB,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_definition_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_execution_logs" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "agentId" TEXT,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "latencyMs" INTEGER,
    "modelUsed" TEXT,
    "toolName" TEXT,
    "toolInput" JSONB,
    "toolOutput" JSONB,
    "toolSuccess" BOOLEAN,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,

    CONSTRAINT "agent_execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "longDescription" TEXT,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "complexity" TEXT NOT NULL DEFAULT 'intermediate',
    "estimatedSetupTime" TEXT,
    "templateConfig" JSONB NOT NULL,
    "useCases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exampleOutputs" JSONB,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_definitions_slug_key" ON "agent_definitions"("slug");

-- CreateIndex
CREATE INDEX "agent_definitions_createdById_idx" ON "agent_definitions"("createdById");

-- CreateIndex
CREATE INDEX "agent_definitions_isPublished_isEnabled_idx" ON "agent_definitions"("isPublished", "isEnabled");

-- CreateIndex
CREATE INDEX "agent_definitions_category_idx" ON "agent_definitions"("category");

-- CreateIndex
CREATE INDEX "agent_definitions_isTemplate_idx" ON "agent_definitions"("isTemplate");

-- CreateIndex
CREATE INDEX "agent_definitions_slug_idx" ON "agent_definitions"("slug");

-- CreateIndex
CREATE INDEX "agent_versions_agentId_idx" ON "agent_versions"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_versions_agentId_version_key" ON "agent_versions"("agentId", "version");

-- CreateIndex
CREATE INDEX "agent_definition_executions_agentId_idx" ON "agent_definition_executions"("agentId");

-- CreateIndex
CREATE INDEX "agent_definition_executions_status_idx" ON "agent_definition_executions"("status");

-- CreateIndex
CREATE INDEX "agent_definition_executions_userId_idx" ON "agent_definition_executions"("userId");

-- CreateIndex
CREATE INDEX "agent_definition_executions_startedAt_idx" ON "agent_definition_executions"("startedAt");

-- CreateIndex
CREATE INDEX "agent_execution_logs_executionId_idx" ON "agent_execution_logs"("executionId");

-- CreateIndex
CREATE INDEX "agent_execution_logs_agentId_idx" ON "agent_execution_logs"("agentId");

-- CreateIndex
CREATE INDEX "agent_execution_logs_level_idx" ON "agent_execution_logs"("level");

-- CreateIndex
CREATE INDEX "agent_execution_logs_category_idx" ON "agent_execution_logs"("category");

-- CreateIndex
CREATE INDEX "agent_execution_logs_timestamp_idx" ON "agent_execution_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "agent_templates_slug_key" ON "agent_templates"("slug");

-- CreateIndex
CREATE INDEX "agent_templates_category_idx" ON "agent_templates"("category");

-- CreateIndex
CREATE INDEX "agent_templates_isActive_isFeatured_idx" ON "agent_templates"("isActive", "isFeatured");

-- CreateIndex
CREATE INDEX "agent_templates_slug_idx" ON "agent_templates"("slug");

-- AddForeignKey
ALTER TABLE "agent_versions" ADD CONSTRAINT "agent_versions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_definition_executions" ADD CONSTRAINT "agent_definition_executions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_execution_logs" ADD CONSTRAINT "agent_execution_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "agent_definition_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_execution_logs" ADD CONSTRAINT "agent_execution_logs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agent_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
