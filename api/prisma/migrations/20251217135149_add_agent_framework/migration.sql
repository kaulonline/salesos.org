-- CreateEnum
CREATE TYPE "AgentTypeEnum" AS ENUM ('DEAL_HEALTH', 'PIPELINE_ACCELERATION', 'ACCOUNT_INTELLIGENCE', 'OUTREACH_OPTIMIZATION', 'MEETING_PREP', 'COACHING', 'COMPETITIVE_INTELLIGENCE', 'DATA_ENRICHMENT', 'WORKFLOW_AUTOMATION');

-- CreateTable
CREATE TABLE "agent_executions" (
    "id" TEXT NOT NULL,
    "agentType" "AgentTypeEnum" NOT NULL,
    "triggerType" TEXT NOT NULL,
    "triggerId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "alertsCreated" INTEGER NOT NULL DEFAULT 0,
    "actionsGenerated" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_alerts" (
    "id" TEXT NOT NULL,
    "agentType" "AgentTypeEnum" NOT NULL,
    "alertType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "suggestedActions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "actionedAt" TIMESTAMP(3),
    "actionedBy" TEXT,
    "dismissedAt" TIMESTAMP(3),
    "dismissedBy" TEXT,

    CONSTRAINT "agent_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_actions" (
    "id" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "result" JSONB,
    "error" TEXT,
    "executionId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_executions_agentType_idx" ON "agent_executions"("agentType");

-- CreateIndex
CREATE INDEX "agent_executions_status_idx" ON "agent_executions"("status");

-- CreateIndex
CREATE INDEX "agent_executions_userId_idx" ON "agent_executions"("userId");

-- CreateIndex
CREATE INDEX "agent_executions_createdAt_idx" ON "agent_executions"("createdAt");

-- CreateIndex
CREATE INDEX "agent_executions_entityType_entityId_idx" ON "agent_executions"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "agent_alerts_userId_status_idx" ON "agent_alerts"("userId", "status");

-- CreateIndex
CREATE INDEX "agent_alerts_agentType_idx" ON "agent_alerts"("agentType");

-- CreateIndex
CREATE INDEX "agent_alerts_entityType_entityId_idx" ON "agent_alerts"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "agent_alerts_createdAt_idx" ON "agent_alerts"("createdAt");

-- CreateIndex
CREATE INDEX "agent_alerts_priority_idx" ON "agent_alerts"("priority");

-- CreateIndex
CREATE INDEX "agent_actions_status_idx" ON "agent_actions"("status");

-- CreateIndex
CREATE INDEX "agent_actions_actionType_idx" ON "agent_actions"("actionType");

-- CreateIndex
CREATE INDEX "agent_actions_executionId_idx" ON "agent_actions"("executionId");

-- CreateIndex
CREATE INDEX "agent_actions_userId_idx" ON "agent_actions"("userId");
