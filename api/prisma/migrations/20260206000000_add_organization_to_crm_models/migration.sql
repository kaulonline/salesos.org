-- Add organizationId to all CRM models for multi-tenant isolation
-- This migration adds optional organizationId to allow gradual migration

-- Lead table
ALTER TABLE "Lead" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");
CREATE INDEX "Lead_organizationId_ownerId_idx" ON "Lead"("organizationId", "ownerId");
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Account table
ALTER TABLE "Account" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Account_organizationId_idx" ON "Account"("organizationId");
CREATE INDEX "Account_organizationId_ownerId_idx" ON "Account"("organizationId", "ownerId");
ALTER TABLE "Account" ADD CONSTRAINT "Account_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Contact table
ALTER TABLE "Contact" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");
CREATE INDEX "Contact_organizationId_ownerId_idx" ON "Contact"("organizationId", "ownerId");
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Opportunity table
ALTER TABLE "Opportunity" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Opportunity_organizationId_idx" ON "Opportunity"("organizationId");
CREATE INDEX "Opportunity_organizationId_ownerId_idx" ON "Opportunity"("organizationId", "ownerId");
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Quote table
ALTER TABLE "Quote" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Quote_organizationId_idx" ON "Quote"("organizationId");
CREATE INDEX "Quote_organizationId_ownerId_idx" ON "Quote"("organizationId", "ownerId");
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Order table
ALTER TABLE "orders" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Order_organizationId_idx" ON "orders"("organizationId");
ALTER TABLE "orders" ADD CONSTRAINT "Order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Task table
ALTER TABLE "Task" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Activity table
ALTER TABLE "Activity" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Activity_organizationId_idx" ON "Activity"("organizationId");
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Contract table
ALTER TABLE "Contract" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Contract_organizationId_idx" ON "Contract"("organizationId");
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note table
ALTER TABLE "Note" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Note_organizationId_idx" ON "Note"("organizationId");
ALTER TABLE "Note" ADD CONSTRAINT "Note_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Pipeline table
ALTER TABLE "Pipeline" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Pipeline_organizationId_idx" ON "Pipeline"("organizationId");
ALTER TABLE "Pipeline" ADD CONSTRAINT "Pipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PipelineStage table
ALTER TABLE "PipelineStage" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "PipelineStage_organizationId_idx" ON "PipelineStage"("organizationId");
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Campaign table
ALTER TABLE "Campaign" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Product table
ALTER TABLE "Product" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- EmailThread table
ALTER TABLE "EmailThread" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "EmailThread_organizationId_idx" ON "EmailThread"("organizationId");
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Territory table
ALTER TABLE "territories" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Territory_organizationId_idx" ON "territories"("organizationId");
ALTER TABLE "territories" ADD CONSTRAINT "Territory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Playbook table
ALTER TABLE "playbooks" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "Playbook_organizationId_idx" ON "playbooks"("organizationId");
ALTER TABLE "playbooks" ADD CONSTRAINT "Playbook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: After migrating existing data to have organizationId values,
-- you can run a follow-up migration to make the column NOT NULL if desired
