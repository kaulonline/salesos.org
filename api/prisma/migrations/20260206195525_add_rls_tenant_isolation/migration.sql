-- ============================================================================
-- Row-Level Security (RLS) Migration for Multi-Tenant Data Isolation
-- ============================================================================
-- This migration adds PostgreSQL Row-Level Security policies to enforce
-- tenant isolation at the database level. This is a defense-in-depth measure
-- that ensures data isolation even if application-level filtering is bypassed.
--
-- Prerequisites:
-- - Application sets 'app.current_organization_id' session variable before queries
-- - Application sets 'app.is_admin' session variable for admin users
-- ============================================================================

-- ============================================================================
-- Enable RLS on all multi-tenant tables
-- ============================================================================

-- CRM Core Tables
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Opportunity" ENABLE ROW LEVEL SECURITY;

-- CPQ Tables
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;

-- Supporting Tables
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;

-- Configuration Tables
ALTER TABLE "Pipeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Territory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Playbook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaybookStep" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlaybookExecution" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Create RLS Policies for tenant isolation
-- ============================================================================
-- Policy logic:
-- 1. If app.is_admin is 'true', allow access (system admin bypass)
-- 2. Otherwise, only allow access to rows where organizationId matches
--    app.current_organization_id session variable
-- 3. Records with NULL organizationId are blocked (legacy data safety)
-- ============================================================================

-- Lead table policies
CREATE POLICY tenant_isolation_lead ON "Lead"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Account table policies
CREATE POLICY tenant_isolation_account ON "Account"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Contact table policies
CREATE POLICY tenant_isolation_contact ON "Contact"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Opportunity table policies
CREATE POLICY tenant_isolation_opportunity ON "Opportunity"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Quote table policies
CREATE POLICY tenant_isolation_quote ON "Quote"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Order table policies
CREATE POLICY tenant_isolation_order ON "Order"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Product table policies
CREATE POLICY tenant_isolation_product ON "Product"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Contract table policies
CREATE POLICY tenant_isolation_contract ON "Contract"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Campaign table policies
CREATE POLICY tenant_isolation_campaign ON "Campaign"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Task table policies
CREATE POLICY tenant_isolation_task ON "Task"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Activity table policies
CREATE POLICY tenant_isolation_activity ON "Activity"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Note table policies
CREATE POLICY tenant_isolation_note ON "Note"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Pipeline table policies
CREATE POLICY tenant_isolation_pipeline ON "Pipeline"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- PipelineStage table policies (inherits from pipeline)
CREATE POLICY tenant_isolation_pipeline_stage ON "PipelineStage"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Territory table policies
CREATE POLICY tenant_isolation_territory ON "Territory"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- Playbook table policies
CREATE POLICY tenant_isolation_playbook ON "Playbook"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- PlaybookStep table policies
CREATE POLICY tenant_isolation_playbook_step ON "PlaybookStep"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- PlaybookExecution table policies
CREATE POLICY tenant_isolation_playbook_execution ON "PlaybookExecution"
  FOR ALL
  USING (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  )
  WITH CHECK (
    current_setting('app.is_admin', true) = 'true'
    OR (
      "organizationId" IS NOT NULL
      AND "organizationId" = current_setting('app.current_organization_id', true)
    )
  );

-- ============================================================================
-- Create helper function to verify RLS context is set
-- ============================================================================
CREATE OR REPLACE FUNCTION check_rls_context()
RETURNS BOOLEAN AS $$
BEGIN
  -- Return true if either admin or valid org context
  IF current_setting('app.is_admin', true) = 'true' THEN
    RETURN TRUE;
  END IF;

  IF current_setting('app.current_organization_id', true) IS NOT NULL
     AND current_setting('app.current_organization_id', true) != '' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Create audit function to log RLS bypass attempts
-- ============================================================================
CREATE OR REPLACE FUNCTION log_rls_bypass_attempt()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when records with NULL organizationId are accessed
  IF NEW."organizationId" IS NULL AND current_setting('app.is_admin', true) != 'true' THEN
    RAISE WARNING 'RLS: Attempt to access/modify record without organizationId in table %', TG_TABLE_NAME;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Add indexes to optimize RLS filtering
-- ============================================================================
-- These indexes help PostgreSQL efficiently filter by organizationId

CREATE INDEX IF NOT EXISTS idx_lead_organization ON "Lead"("organizationId");
CREATE INDEX IF NOT EXISTS idx_account_organization ON "Account"("organizationId");
CREATE INDEX IF NOT EXISTS idx_contact_organization ON "Contact"("organizationId");
CREATE INDEX IF NOT EXISTS idx_opportunity_organization ON "Opportunity"("organizationId");
CREATE INDEX IF NOT EXISTS idx_quote_organization ON "Quote"("organizationId");
CREATE INDEX IF NOT EXISTS idx_order_organization ON "Order"("organizationId");
CREATE INDEX IF NOT EXISTS idx_product_organization ON "Product"("organizationId");
CREATE INDEX IF NOT EXISTS idx_contract_organization ON "Contract"("organizationId");
CREATE INDEX IF NOT EXISTS idx_campaign_organization ON "Campaign"("organizationId");
CREATE INDEX IF NOT EXISTS idx_task_organization ON "Task"("organizationId");
CREATE INDEX IF NOT EXISTS idx_activity_organization ON "Activity"("organizationId");
CREATE INDEX IF NOT EXISTS idx_note_organization ON "Note"("organizationId");
CREATE INDEX IF NOT EXISTS idx_pipeline_organization ON "Pipeline"("organizationId");
CREATE INDEX IF NOT EXISTS idx_pipeline_stage_organization ON "PipelineStage"("organizationId");
CREATE INDEX IF NOT EXISTS idx_territory_organization ON "Territory"("organizationId");
CREATE INDEX IF NOT EXISTS idx_playbook_organization ON "Playbook"("organizationId");
CREATE INDEX IF NOT EXISTS idx_playbook_step_organization ON "PlaybookStep"("organizationId");
CREATE INDEX IF NOT EXISTS idx_playbook_execution_organization ON "PlaybookExecution"("organizationId");

-- ============================================================================
-- IMPORTANT: Migration of orphaned records
-- ============================================================================
-- This script identifies records without organizationId that need migration.
-- Run this query after migration to find orphaned records:
--
-- SELECT 'Lead' as table_name, COUNT(*) as orphan_count FROM "Lead" WHERE "organizationId" IS NULL
-- UNION ALL
-- SELECT 'Account', COUNT(*) FROM "Account" WHERE "organizationId" IS NULL
-- UNION ALL
-- SELECT 'Contact', COUNT(*) FROM "Contact" WHERE "organizationId" IS NULL
-- UNION ALL
-- SELECT 'Opportunity', COUNT(*) FROM "Opportunity" WHERE "organizationId" IS NULL
-- UNION ALL
-- SELECT 'Quote', COUNT(*) FROM "Quote" WHERE "organizationId" IS NULL
-- UNION ALL
-- SELECT 'Order', COUNT(*) FROM "Order" WHERE "organizationId" IS NULL;
--
-- To assign orphaned records to their owner's organization:
--
-- UPDATE "Lead" l
-- SET "organizationId" = (
--   SELECT om."organizationId" FROM "OrganizationMember" om
--   WHERE om."userId" = l."ownerId" AND om."isActive" = true LIMIT 1
-- )
-- WHERE l."organizationId" IS NULL AND l."ownerId" IS NOT NULL;
-- ============================================================================
