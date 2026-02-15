# User Role Hierarchy & Organization Management Guide

**Date**: February 14, 2026
**System**: SalesOS Multi-Tenant Architecture

---

## 🎯 Two-Tier Role System

SalesOS uses a **dual role system** to separate system-wide permissions from organization-specific permissions:

```
┌─────────────────────────────────────────────────────────┐
│ TIER 1: System-Wide Roles (User.role)                   │
│ Controls: Access to system admin features               │
├─────────────────────────────────────────────────────────┤
│ • ADMIN    - Super admin (can see ALL organizations)   │
│ • MANAGER  - System manager (limited cross-org access) │
│ • USER     - Regular user (single org access)          │
│ • VIEWER   - Read-only access                          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ TIER 2: Organization Roles (OrganizationMember.role)    │
│ Controls: Permissions WITHIN an organization            │
├─────────────────────────────────────────────────────────┤
│ • OWNER    - Full control (can delete organization)    │
│ • ADMIN    - Manage members, settings (org admin)      │
│ • MANAGER  - Manage team, view reports                 │
│ • MEMBER   - Standard user access                      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔐 Role Definitions

### System-Wide Roles (Tier 1)

#### ADMIN (Super Admin)
**Database**: `User.role = 'ADMIN'`

**Capabilities**:
- ✅ Access ALL organizations
- ✅ View all users across all organizations
- ✅ Manage system-wide settings
- ✅ Access admin console (`/api/admin/*`)
- ✅ Create/delete organizations
- ✅ Bypass organization guards (when `@AllowCrossOrganization` decorator used)
- ✅ View analytics across all tenants
- ✅ Manage licenses and billing

**Users with this role**:
- `admin@iriseller.com` (if system admin)
- Other designated system administrators

**Security Note**: This role has FULL system access. Assign carefully.

#### MANAGER (System Manager)
**Database**: `User.role = 'MANAGER'`

**Capabilities**:
- ✅ Access to admin endpoints with restrictions
- ✅ Can only see users in their own organization
- ❌ Cannot access other organizations
- ❌ Cannot manage system-wide settings

#### USER (Regular User)
**Database**: `User.role = 'USER'`

**Capabilities**:
- ✅ Standard user access
- ✅ Access to their organization's data only
- ❌ No admin console access
- ❌ No system management capabilities

#### VIEWER (Read-Only)
**Database**: `User.role = 'VIEWER'`

**Capabilities**:
- ✅ Read-only access
- ❌ Cannot modify data
- ❌ No administrative access

---

### Organization Roles (Tier 2)

#### OWNER
**Database**: `OrganizationMember.role = 'OWNER'`

**Capabilities** (within their organization):
- ✅ Full control of organization
- ✅ Can delete organization
- ✅ Manage all members
- ✅ Manage billing and licenses
- ✅ Access CRM migration tools
- ✅ Change organization settings
- ✅ Transfer ownership

**Example**:
- User `john@acmecorp.com` with OWNER role in "Acme Corp" organization

#### ADMIN (Organization Admin)
**Database**: `OrganizationMember.role = 'ADMIN'`

**Capabilities** (within their organization):
- ✅ Manage organization members
- ✅ Manage licenses and seats
- ✅ Access CRM migration tools
- ✅ Change organization settings
- ❌ Cannot delete organization
- ❌ Cannot transfer ownership

**Example**:
- `admin@iriseller.com` with ADMIN role in "IriSeller" organization
- `jchen@iriseller.com` with ADMIN role in "IriSeller" organization

#### MANAGER (Team Manager)
**Database**: `OrganizationMember.role = 'MANAGER'`

**Capabilities** (within their organization):
- ✅ Manage team members
- ✅ View reports and analytics
- ✅ Assign tasks and leads
- ❌ Cannot manage organization settings
- ❌ Cannot import data (CRM migration)
- ❌ Cannot manage billing

**Example**:
- `manager@iriseller.com` with MANAGER role in "IriSeller" organization

#### MEMBER
**Database**: `OrganizationMember.role = 'MEMBER'`

**Capabilities** (within their organization):
- ✅ Access CRM data (leads, accounts, contacts, opportunities)
- ✅ Create and edit records they own
- ✅ View team records (based on settings)
- ❌ Cannot manage users
- ❌ Cannot import data
- ❌ No admin access

---

## 🔍 How to View Organization Members

### API Endpoints

#### 1. List All Users (Super Admin Only)
```bash
GET /api/admin/users
Headers: Authorization: Bearer <jwt_token>
Query Parameters:
  - organizationId (optional): Filter by specific organization
  - page: Page number
  - pageSize: Items per page
  - search: Search by email/name
  - role: Filter by system role (ADMIN, MANAGER, USER, VIEWER)
  - status: Filter by status (ACTIVE, INACTIVE)

Response:
{
  "users": [
    {
      "id": "user-123",
      "email": "admin@iriseller.com",
      "name": "Admin User",
      "role": "USER",  // System role
      "status": "ACTIVE",
      "organizationMemberships": [
        {
          "organizationId": "org-456",
          "organizationName": "IriSeller",
          "role": "ADMIN",  // Organization role
          "isActive": true
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

#### 2. List Organization Members (Admin/Owner Only)
```bash
GET /api/organizations/:organizationId/members
Headers: Authorization: Bearer <jwt_token>
Query Parameters:
  - includeInactive: true/false (default: false)

Response:
{
  "members": [
    {
      "id": "member-123",
      "userId": "user-456",
      "email": "admin@iriseller.com",
      "name": "Admin User",
      "role": "ADMIN",  // Organization role
      "isActive": true,
      "joinedAt": "2026-01-15T10:00:00Z",
      "department": "Engineering"
    },
    {
      "id": "member-124",
      "userId": "user-457",
      "email": "manager@iriseller.com",
      "name": "Manager User",
      "role": "MANAGER",
      "isActive": true,
      "joinedAt": "2026-01-20T14:30:00Z"
    }
  ]
}
```

---

## 📊 Database Queries

### Query 1: Find All Super Admins
```sql
-- Users with system-wide ADMIN role
SELECT
  id,
  email,
  name,
  role as system_role,
  status,
  created_at
FROM users
WHERE role = 'ADMIN'
  AND status = 'ACTIVE'
ORDER BY email;
```

### Query 2: Find All Organization Admins for a Specific Organization
```sql
-- Organization admins and owners (not system admins)
SELECT
  u.id,
  u.email,
  u.name,
  u.role as system_role,
  om.role as org_role,
  om.is_active,
  om.joined_at,
  om.department,
  o.name as organization_name
FROM users u
INNER JOIN organization_members om ON u.id = om.user_id
INNER JOIN organizations o ON om.organization_id = o.id
WHERE om.role IN ('OWNER', 'ADMIN')
  AND om.is_active = true
  AND om.organization_id = '<ORGANIZATION_ID>'
ORDER BY
  CASE om.role
    WHEN 'OWNER' THEN 1
    WHEN 'ADMIN' THEN 2
  END,
  u.email;
```

### Query 3: Find ALL Members of a Specific Organization
```sql
-- All members (OWNER, ADMIN, MANAGER, MEMBER) for an organization
SELECT
  u.id as user_id,
  u.email,
  u.name,
  u.role as system_role,
  om.role as org_role,
  om.is_active,
  om.joined_at,
  om.department,
  om.title,
  CASE
    WHEN u.role = 'ADMIN' THEN 'Super Admin + Org ' || om.role
    ELSE 'Org ' || om.role
  END as effective_role
FROM users u
INNER JOIN organization_members om ON u.id = om.user_id
INNER JOIN organizations o ON om.organization_id = o.id
WHERE om.organization_id = '<ORGANIZATION_ID>'
  AND om.is_active = true
ORDER BY
  CASE om.role
    WHEN 'OWNER' THEN 1
    WHEN 'ADMIN' THEN 2
    WHEN 'MANAGER' THEN 3
    WHEN 'MEMBER' THEN 4
  END,
  u.email;
```

### Query 4: Find User by Email and Show All Organization Memberships
```sql
-- Get user's details and all organization memberships
SELECT
  u.id,
  u.email,
  u.name,
  u.role as system_role,
  u.status,
  o.id as org_id,
  o.name as org_name,
  om.role as org_role,
  om.is_active as member_active,
  om.joined_at,
  om.department
FROM users u
LEFT JOIN organization_members om ON u.id = om.user_id
LEFT JOIN organizations o ON om.organization_id = o.id
WHERE u.email = 'admin@iriseller.com'
ORDER BY om.joined_at DESC;
```

### Query 5: Organization Summary with Member Counts
```sql
-- Get organization with role breakdown
SELECT
  o.id,
  o.name,
  o.status,
  COUNT(DISTINCT om.id) as total_members,
  COUNT(DISTINCT CASE WHEN om.role = 'OWNER' THEN om.id END) as owners,
  COUNT(DISTINCT CASE WHEN om.role = 'ADMIN' THEN om.id END) as admins,
  COUNT(DISTINCT CASE WHEN om.role = 'MANAGER' THEN om.id END) as managers,
  COUNT(DISTINCT CASE WHEN om.role = 'MEMBER' THEN om.id END) as members
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
  AND om.is_active = true
WHERE o.id = '<ORGANIZATION_ID>'
GROUP BY o.id, o.name, o.status;
```

---

## 🎯 Example Scenarios

### Scenario 1: Super Admin Views All Organizations

**User**: `superadmin@salesos.com` with `User.role = 'ADMIN'`

**Access**:
```
✅ GET /api/admin/users (can see ALL users)
✅ GET /api/admin/users?organizationId=org-123 (can filter)
✅ GET /api/organizations (can see ALL organizations)
✅ GET /api/organizations/org-123/members (can see any org's members)
✅ Can switch between organizations
✅ Can perform actions on behalf of any organization
```

### Scenario 2: Organization Admin Views Their Organization

**User**: `admin@iriseller.com` with:
- `User.role = 'USER'` (regular system role)
- `OrganizationMember.role = 'ADMIN'` in "IriSeller" organization

**Access**:
```
✅ GET /api/organizations/:orgId/members (only for IriSeller org)
✅ Can manage members in IriSeller org
✅ Can import CRM data for IriSeller org
✅ Can view settings for IriSeller org
❌ Cannot access /api/admin/users (not system admin)
❌ Cannot see other organizations
❌ Cannot perform cross-org operations
```

### Scenario 3: Manager Views Their Team

**User**: `manager@iriseller.com` with:
- `User.role = 'USER'`
- `OrganizationMember.role = 'MANAGER'` in "IriSeller" organization

**Access**:
```
✅ Can view team members in IriSeller org
✅ Can manage leads/accounts in IriSeller org
✅ Can view reports for IriSeller org
❌ Cannot manage organization settings
❌ Cannot import CRM data
❌ Cannot add/remove organization members
❌ Cannot access admin console
```

---

## 🔒 Security Implementation

### How organizationId is Enforced

```typescript
// 1. JWT Token contains user's primary organizationId
const payload = {
  sub: user.id,
  email: user.email,
  role: user.role,  // System role (ADMIN, USER, etc.)
  organizationId: primaryOrganizationId,  // User's primary org
};

// 2. OrganizationGuard validates membership
const membership = await prisma.organizationMember.findFirst({
  where: {
    userId: user.id,
    organizationId: request.organizationId,
    isActive: true,
  },
});

// 3. Organization role injected into request
request.organizationRole = membership.role;  // OWNER, ADMIN, MANAGER, MEMBER

// 4. RolesGuard checks appropriate role
@Roles('ADMIN', 'OWNER')  // Requires Org ADMIN or OWNER
async importData(...) { }
```

### Cross-Tenant Protection

```typescript
// ❌ This is BLOCKED - user cannot access other organizations
GET /api/organizations/different-org-id/members
// Even if they're ADMIN in their own org, they can't see other orgs

// ✅ This is ALLOWED for system admins only
@AllowCrossOrganization()  // Special decorator for super admins
@Roles('ADMIN')  // System role ADMIN
async viewAllOrganizations() { }
```

---

## 📋 Checklist for Managing Users

### For Super Admins (User.role = 'ADMIN')

- [ ] Use `/api/admin/users` to view all users across all organizations
- [ ] Use `/api/admin/users?organizationId=xxx` to filter by organization
- [ ] Use `/api/organizations/:id/members` to view specific org members
- [ ] Check `User.role` field to identify other super admins
- [ ] Check `OrganizationMember.role` to see org-specific permissions
- [ ] Monitor for users with both system ADMIN role AND org OWNER role (highest privilege)

### For Organization Admins (OrganizationMember.role = 'ADMIN')

- [ ] Use `/api/organizations/:yourOrgId/members` to view org members
- [ ] Can invite new members to organization
- [ ] Can change member roles within organization
- [ ] Can remove members from organization
- [ ] Cannot see or access other organizations

---

## 🛠️ Admin Tools

### CLI Commands to Check Users

```bash
# Connect to database
cd /opt/salesos.org/api

# Find all super admins
npx prisma studio
# Or use SQL client with query from above

# Find organization members via API
curl -H "Authorization: Bearer <token>" \
  https://salesos.org/api/organizations/<org-id>/members

# Find specific user
curl -H "Authorization: Bearer <token>" \
  https://salesos.org/api/admin/users?search=admin@iriseller.com
```

---

## 📝 User Examples

Based on your specific users:

### admin@iriseller.com
```yaml
Email: admin@iriseller.com
System Role: USER (or ADMIN if super admin)
Organization: IriSeller
Org Role: ADMIN
Permissions:
  - ✅ Manage IriSeller organization members
  - ✅ Import CRM data for IriSeller
  - ✅ Configure IriSeller settings
  - ❌ Access other organizations (unless system ADMIN)
```

### manager@iriseller.com
```yaml
Email: manager@iriseller.com
System Role: USER (likely)
Organization: IriSeller
Org Role: MANAGER
Permissions:
  - ✅ View IriSeller team
  - ✅ Manage leads/accounts in IriSeller
  - ✅ View reports for IriSeller
  - ❌ Manage organization settings
  - ❌ Import CRM data
```

### jchen@iriseller.com
```yaml
Email: jchen@iriseller.com
System Role: USER (or ADMIN if super admin)
Organization: IriSeller
Org Role: ADMIN or OWNER (depending on assignment)
Permissions: (depends on specific role assignment)
```

---

## 🔍 How to Check Current State

### Step 1: Connect to Database
```bash
cd /opt/salesos.org/api
npx prisma studio
# Opens database UI at http://localhost:5555
```

### Step 2: Check Users Table
- Look at `role` column for system roles
- Find users with `role = 'ADMIN'` (super admins)

### Step 3: Check OrganizationMembers Table
- Look at `role` column for organization roles
- Find members with `role = 'OWNER'` or `role = 'ADMIN'`
- Match with `userId` to see which users are org admins

### Step 4: Join Query (recommended)
Run Query 3 or 4 from above to see full picture

---

## 🚨 Important Notes

### Multi-Organization Users
- A user CAN belong to multiple organizations
- Each membership has its own role
- JWT contains only PRIMARY organization
- User can switch between organizations (if implemented)

### Role Hierarchy
```
System ADMIN + Org OWNER  = Highest privilege
System ADMIN + Org ADMIN  = Very high privilege
System USER  + Org OWNER  = High privilege (within org)
System USER  + Org ADMIN  = Medium-high privilege (within org)
System USER  + Org MANAGER = Medium privilege (within org)
System USER  + Org MEMBER  = Standard privilege (within org)
```

### Security Best Practices
1. ✅ Minimize number of system ADMINs
2. ✅ Use organization roles for most admin tasks
3. ✅ Audit system ADMIN access regularly
4. ✅ Each organization should have at least one OWNER
5. ✅ Use MANAGER role for team leads
6. ✅ Regular users should have MEMBER role

---

## 📚 Related Documentation

- **Multi-Tenant Security**: `/opt/salesos.org/api/docs/MULTI_TENANT_SECURITY.md`
- **Import Security**: `/opt/salesos.org/DATA_IMPORT_SECURITY.md`
- **Database Schema**: `/opt/salesos.org/api/prisma/schema.prisma`

---

## 🎓 Quick Reference

| Need to... | System Role | Org Role | Endpoint |
|-----------|-------------|----------|----------|
| View all users (all orgs) | ADMIN | - | GET /api/admin/users |
| View org members | - | ADMIN/OWNER | GET /api/organizations/:id/members |
| Manage org members | - | ADMIN/OWNER | POST/DELETE /api/organizations/:id/members |
| Import CRM data | - | ADMIN/OWNER | POST /api/import-export/import |
| Delete organization | - | OWNER | DELETE /api/organizations/:id |
| Manage system settings | ADMIN | - | /api/admin/* |

---

**Last Updated**: February 14, 2026
**Next Review**: May 14, 2026
