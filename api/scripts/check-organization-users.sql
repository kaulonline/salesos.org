-- ====================================================================
-- SalesOS Organization User Check Queries
-- ====================================================================
-- Use these queries to check user roles and organization memberships
-- Run with: npx prisma db execute --file scripts/check-organization-users.sql
-- Or use Prisma Studio: npx prisma studio
-- ====================================================================

-- ====================================================================
-- QUERY 1: Find ALL System Super Admins
-- ====================================================================
-- These users have system-wide ADMIN role and can access all organizations

SELECT
  id,
  email,
  name,
  role as system_role,
  status,
  last_login_at,
  created_at
FROM users
WHERE role = 'ADMIN'
ORDER BY email;

-- Expected output: Users like admin@iriseller.com (if they are system admins)


-- ====================================================================
-- QUERY 2: Find Specific Users (admin@iriseller.com, manager@iriseller.com, jchen@iriseller.com)
-- ====================================================================

SELECT
  u.id,
  u.email,
  u.name,
  u.role as system_role,
  u.status,
  u.created_at
FROM users u
WHERE u.email IN (
  'admin@iriseller.com',
  'manager@iriseller.com',
  'jchen@iriseller.com'
)
ORDER BY u.email;


-- ====================================================================
-- QUERY 3: Find ALL Organization Memberships for Specific Users
-- ====================================================================
-- Shows which organizations these users belong to and their roles

SELECT
  u.email,
  u.role as system_role,
  o.name as organization,
  om.role as org_role,
  om.is_active,
  om.joined_at,
  om.department,
  CASE
    WHEN u.role = 'ADMIN' AND om.role = 'OWNER' THEN '🔴 Super Admin + Org Owner (Highest)'
    WHEN u.role = 'ADMIN' AND om.role = 'ADMIN' THEN '🟠 Super Admin + Org Admin (Very High)'
    WHEN u.role = 'ADMIN' THEN '🟡 Super Admin (High)'
    WHEN om.role = 'OWNER' THEN '🟢 Organization Owner'
    WHEN om.role = 'ADMIN' THEN '🔵 Organization Admin'
    WHEN om.role = 'MANAGER' THEN '🟣 Organization Manager'
    ELSE '⚪ Organization Member'
  END as privilege_level
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email IN (
  'admin@iriseller.com',
  'manager@iriseller.com',
  'jchen@iriseller.com'
)
ORDER BY
  u.email,
  CASE om.role
    WHEN 'OWNER' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'MEMBER' THEN 4
  END;


-- ====================================================================
-- QUERY 4: Find ALL Members of IriSeller Organization (by name)
-- ====================================================================

SELECT
  u.email,
  u.name,
  u.role as system_role,
  om.role as org_role,
  om.is_active,
  om.joined_at,
  om.department,
  om.title,
  CASE om.role
    WHEN 'OWNER' THEN '1 - OWNER'
    WHEN 'ADMIN' THEN '2 - ADMIN'
    WHEN 'MANAGER' THEN '3 - MANAGER'
    ELSE '4 - MEMBER'
  END as role_priority
FROM organizations o
INNER JOIN organization_members om ON o.id = om.organization_id
INNER JOIN users u ON om.user_id = u.id
WHERE o.name LIKE '%IriSeller%'
  OR o.name LIKE '%Iris%'
  AND om.is_active = true
ORDER BY
  CASE om.role
    WHEN 'OWNER' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'MEMBER' THEN 4
  END,
  u.email;


-- ====================================================================
-- QUERY 5: Find ALL Organizations and Their Admin Counts
-- ====================================================================
-- Shows summary of each organization with role breakdown

SELECT
  o.id,
  o.name,
  o.status,
  o.created_at,
  COUNT(DISTINCT om.id) as total_members,
  COUNT(DISTINCT CASE WHEN om.role = 'OWNER' THEN om.id END) as owners,
  COUNT(DISTINCT CASE WHEN om.role = 'ADMIN' THEN om.id END) as admins,
  COUNT(DISTINCT CASE WHEN om.role = 'MANAGER' THEN om.id END) as managers,
  COUNT(DISTINCT CASE WHEN om.role = 'MEMBER' THEN om.id END) as members,
  -- Get emails of owners and admins
  STRING_AGG(
    DISTINCT CASE
      WHEN om.role IN ('OWNER', 'ADMIN')
      THEN u.email
    END,
    ', '
  ) as admin_emails
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id AND om.is_active = true
LEFT JOIN users u ON om.user_id = u.id
GROUP BY o.id, o.name, o.status, o.created_at
ORDER BY o.created_at DESC;


-- ====================================================================
-- QUERY 6: Security Audit - Users with Elevated Permissions
-- ====================================================================
-- Find all users who have either system ADMIN role OR organization OWNER/ADMIN roles

SELECT DISTINCT
  u.id,
  u.email,
  u.name,
  u.role as system_role,
  STRING_AGG(
    DISTINCT o.name || ' (' || om.role || ')',
    ', '
  ) as organizations_and_roles,
  u.last_login_at,
  u.status
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE
  u.role IN ('ADMIN', 'MANAGER')  -- System-wide elevated roles
  OR om.role IN ('OWNER', 'ADMIN')  -- Organization elevated roles
GROUP BY u.id, u.email, u.name, u.role, u.last_login_at, u.status
ORDER BY
  CASE u.role
    WHEN 'ADMIN' THEN 1
    WHEN 'MANAGER' THEN 2
    ELSE 3
  END,
  u.email;


-- ====================================================================
-- QUERY 7: Find Orphaned Users (No Organization Membership)
-- ====================================================================
-- Users who exist but don't belong to any active organization

SELECT
  u.id,
  u.email,
  u.name,
  u.role as system_role,
  u.status,
  u.created_at,
  COUNT(om.id) as membership_count
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
WHERE u.status = 'ACTIVE'
GROUP BY u.id, u.email, u.name, u.role, u.status, u.created_at
HAVING COUNT(om.id) = 0
ORDER BY u.created_at DESC;


-- ====================================================================
-- QUERY 8: Check Specific Organization by ID (Replace <ORG_ID>)
-- ====================================================================
-- Detailed member list for a specific organization

-- First, find the organization ID:
SELECT id, name, status FROM organizations WHERE name LIKE '%IriSeller%' OR name LIKE '%Iris%';

-- Then use the ID in this query:
-- Replace '<ORG_ID>' with actual organization ID from above query

/*
SELECT
  u.email,
  u.name,
  u.role as system_role,
  om.role as org_role,
  om.is_active as active_member,
  om.joined_at,
  om.department,
  om.title,
  u.last_login_at,
  CASE
    WHEN om.role = 'OWNER' THEN 'Can delete organization, full control'
    WHEN om.role = 'ADMIN' THEN 'Can manage members, import data, configure settings'
    WHEN om.role = 'MANAGER' THEN 'Can manage team, view reports'
    ELSE 'Standard user access'
  END as permissions_summary
FROM organization_members om
INNER JOIN users u ON om.user_id = u.id
WHERE om.organization_id = '<ORG_ID>'
  AND om.is_active = true
ORDER BY
  CASE om.role
    WHEN 'OWNER' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'MEMBER' THEN 4
  END,
  u.email;
*/


-- ====================================================================
-- QUERY 9: User Login History (Recent Activity)
-- ====================================================================
-- See when users last logged in

SELECT
  u.email,
  u.name,
  u.role as system_role,
  u.last_login_at,
  CASE
    WHEN u.last_login_at IS NULL THEN 'Never logged in'
    WHEN u.last_login_at > NOW() - INTERVAL '1 day' THEN 'Active (< 1 day)'
    WHEN u.last_login_at > NOW() - INTERVAL '7 days' THEN 'Recent (< 7 days)'
    WHEN u.last_login_at > NOW() - INTERVAL '30 days' THEN 'Within month'
    ELSE 'Inactive (> 30 days)'
  END as activity_status,
  STRING_AGG(
    DISTINCT o.name,
    ', '
  ) as organizations
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email IN (
  'admin@iriseller.com',
  'manager@iriseller.com',
  'jchen@iriseller.com'
)
GROUP BY u.id, u.email, u.name, u.role, u.last_login_at
ORDER BY u.last_login_at DESC NULLS LAST;


-- ====================================================================
-- QUERY 10: Full System Audit Report
-- ====================================================================
-- Comprehensive view for super admins

SELECT
  'System Stats' as category,
  'Total Users' as metric,
  COUNT(DISTINCT u.id)::TEXT as value
FROM users u
WHERE u.status = 'ACTIVE'

UNION ALL

SELECT
  'System Stats' as category,
  'Super Admins' as metric,
  COUNT(DISTINCT u.id)::TEXT as value
FROM users u
WHERE u.role = 'ADMIN' AND u.status = 'ACTIVE'

UNION ALL

SELECT
  'System Stats' as category,
  'Total Organizations' as metric,
  COUNT(DISTINCT o.id)::TEXT as value
FROM organizations o
WHERE o.status = 'ACTIVE'

UNION ALL

SELECT
  'System Stats' as category,
  'Organization Owners' as metric,
  COUNT(DISTINCT om.user_id)::TEXT as value
FROM organization_members om
WHERE om.role = 'OWNER' AND om.is_active = true

UNION ALL

SELECT
  'System Stats' as category,
  'Organization Admins' as metric,
  COUNT(DISTINCT om.user_id)::TEXT as value
FROM organization_members om
WHERE om.role = 'ADMIN' AND om.is_active = true

ORDER BY category, metric;


-- ====================================================================
-- USAGE INSTRUCTIONS
-- ====================================================================
--
-- Option 1: Run via psql
-- -----------------
-- psql $DATABASE_URL < scripts/check-organization-users.sql
--
-- Option 2: Use Prisma Studio (Visual UI)
-- -----------------
-- cd /opt/salesos.org/api
-- npx prisma studio
-- (Opens browser at http://localhost:5555)
-- Navigate to tables and run custom queries
--
-- Option 3: Copy-paste into database client
-- -----------------
-- Use DataGrip, DBeaver, pgAdmin, etc.
-- Connect to your PostgreSQL database
-- Copy and paste specific queries
--
-- ====================================================================
