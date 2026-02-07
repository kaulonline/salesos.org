-- Row-Level Security (RLS) Policies for Multi-Tenant Isolation
-- This migration enables database-level tenant isolation as a safety net
-- even if application-level filtering fails.

-- =============================================================================
-- SETUP: Create helper function and role for RLS context
-- =============================================================================

-- Function to get current organization context (set via SET LOCAL)
CREATE OR REPLACE FUNCTION current_org_id() RETURNS TEXT AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_organization_id', true), '');
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if current session is admin (can bypass RLS)
CREATE OR REPLACE FUNCTION is_rls_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('app.is_rls_admin', true), 'false') = 'true';
EXCEPTION
  WHEN OTHERS THEN RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- ENABLE RLS ON CORE CRM TABLES
-- =============================================================================

-- Lead table
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_tenant_isolation ON "Lead"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Account table
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
CREATE POLICY account_tenant_isolation ON "Account"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Contact table
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
CREATE POLICY contact_tenant_isolation ON "Contact"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Opportunity table
ALTER TABLE "Opportunity" ENABLE ROW LEVEL SECURITY;
CREATE POLICY opportunity_tenant_isolation ON "Opportunity"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Quote table
ALTER TABLE "Quote" ENABLE ROW LEVEL SECURITY;
CREATE POLICY quote_tenant_isolation ON "Quote"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Task table
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_tenant_isolation ON "Task"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Activity table
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_tenant_isolation ON "Activity"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Note table
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;
CREATE POLICY note_tenant_isolation ON "Note"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Campaign table
ALTER TABLE "Campaign" ENABLE ROW LEVEL SECURITY;
CREATE POLICY campaign_tenant_isolation ON "Campaign"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Contract table
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
CREATE POLICY contract_tenant_isolation ON "Contract"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Product table
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_tenant_isolation ON "Product"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Pipeline table
ALTER TABLE "Pipeline" ENABLE ROW LEVEL SECURITY;
CREATE POLICY pipeline_tenant_isolation ON "Pipeline"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- PipelineStage table
ALTER TABLE "PipelineStage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY pipelinestage_tenant_isolation ON "PipelineStage"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- EmailThread table
ALTER TABLE "EmailThread" ENABLE ROW LEVEL SECURITY;
CREATE POLICY emailthread_tenant_isolation ON "EmailThread"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- =============================================================================
-- ENABLE RLS ON ADDITIONAL TABLES
-- =============================================================================

-- Orders table (lowercase)
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_tenant_isolation ON "orders"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Territories table
ALTER TABLE "territories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY territories_tenant_isolation ON "territories"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Playbooks table
ALTER TABLE "playbooks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY playbooks_tenant_isolation ON "playbooks"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Workflows table
ALTER TABLE "workflows" ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflows_tenant_isolation ON "workflows"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- Agent definitions table
ALTER TABLE "agent_definitions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_definitions_tenant_isolation ON "agent_definitions"
  USING (
    is_rls_admin() = true
    OR "organizationId" = current_org_id()
    OR "organizationId" IS NULL
  );

-- =============================================================================
-- FORCE RLS FOR TABLE OWNER
-- This ensures RLS applies even when connected as the table owner
-- =============================================================================

-- Force RLS on all tenant-scoped tables
ALTER TABLE "Lead" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Account" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Contact" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Opportunity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Quote" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Task" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Activity" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Note" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Campaign" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Contract" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Product" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Pipeline" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PipelineStage" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EmailThread" FORCE ROW LEVEL SECURITY;
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
ALTER TABLE "territories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "playbooks" FORCE ROW LEVEL SECURITY;
ALTER TABLE "workflows" FORCE ROW LEVEL SECURITY;
ALTER TABLE "agent_definitions" FORCE ROW LEVEL SECURITY;

-- =============================================================================
-- CREATE APPLICATION USER (non-superuser for RLS enforcement)
-- The application should use this user for normal operations
-- Migrations and admin tasks can continue using the superuser
-- =============================================================================

-- Create application user without superuser privileges
-- Password should be changed and stored securely in production
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'iris_app') THEN
    CREATE ROLE iris_app WITH LOGIN PASSWORD 'iris_app_secure_pwd_2024' NOSUPERUSER NOBYPASSRLS;
  END IF;
END
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO iris_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO iris_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO iris_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO iris_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO iris_app;

-- Note: To enable RLS enforcement in production:
-- 1. Update DATABASE_URL to use iris_app user instead of iris superuser
-- 2. Keep superuser connection for migrations only

-- =============================================================================
-- VERIFICATION QUERIES (run manually to test)
-- =============================================================================
-- Test that RLS is working:
-- SET LOCAL app.current_organization_id = 'org123';
-- SELECT * FROM "Lead"; -- Should only return leads for org123
--
-- Test admin bypass:
-- SET LOCAL app.is_rls_admin = 'true';
-- SELECT * FROM "Lead"; -- Should return all leads
