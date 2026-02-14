# Multi-Tenant Security Architecture

## Overview

SalesOS implements a **strict multi-tenant architecture** with organization-level data isolation and role-based access control (RBAC). This document outlines the security mechanisms that prevent cross-tenant data leaks and ensure proper authorization.

---

## Security Layers

### 1. **Authentication Layer**
- **JwtAuthGuard**: Validates JWT tokens and extracts user identity
- Runs on ALL protected routes
- Sets `request.user` with user details

### 2. **Organization Isolation Layer**
- **OrganizationGuard**: Validates user belongs to the organization
- Enforces tenant isolation at the request level
- Sets `request.organizationId` and `request.organizationRole`
- **CRITICAL**: Prevents users from accessing other organizations' data

### 3. **Authorization Layer**
- **RolesGuard**: Checks organization-level roles (OWNER, ADMIN, MANAGER, MEMBER)
- Works with `@Roles()` decorator to restrict endpoints
- Uses `request.organizationRole` set by OrganizationGuard

---

## Organization Roles

```typescript
enum OrganizationMemberRole {
  OWNER   // Full control, can delete organization
  ADMIN   // Can manage members, licenses, settings, import/export data
  MANAGER // Can manage team members, view reports
  MEMBER  // Standard user access (read/write CRM data)
}
```

### Permission Matrix for Migration System

| Operation | OWNER | ADMIN | MANAGER | MEMBER |
|-----------|-------|-------|---------|--------|
| Import Data | ✅ | ✅ | ❌ | ❌ |
| View Migrations | ✅ | ✅ | ❌ | ❌ |
| Delete Migrations | ✅ | ✅ | ❌ | ❌ |
| Cancel Migrations | ✅ | ✅ | ❌ | ❌ |
| View Imported Data | ✅ | ✅ | ✅ | ✅ |

---

## Data Isolation Implementation

### Database Level

All CRM entities have `organizationId` field with indexes:

```prisma
model Lead {
  id             String  @id @default(cuid())
  organizationId String? // Multi-tenant isolation
  ownerId        String
  // ... other fields

  @@index([organizationId])
  @@index([organizationId, ownerId])
}

model Contact {
  organizationId String?
  @@index([organizationId])
}

model Account {
  organizationId String?
  @@index([organizationId])
}

model Opportunity {
  organizationId String?
  @@index([organizationId])
}

model Migration {
  organizationId String
  @@index([organizationId])
}
```

### Service Level

All queries **MUST** filter by `organizationId`:

```typescript
// ✅ CORRECT - Scoped to organization
await this.prisma.lead.findMany({
  where: {
    organizationId,
    status: 'NEW'
  }
});

// ❌ WRONG - Cross-tenant leak!
await this.prisma.lead.findMany({
  where: {
    status: 'NEW' // Missing organizationId!
  }
});
```

### Controller Level

All endpoints use `@CurrentOrganization()` decorator:

```typescript
@Get('leads')
@UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
async getLeads(@CurrentOrganization() organizationId: string) {
  // organizationId is guaranteed to be present and validated
  return this.leadsService.findAll(organizationId);
}
```

---

## Import/Export Security

### Applied Security Controls

1. **Guard Stack**:
   ```typescript
   @UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
   ```
   - JwtAuthGuard: User must be authenticated
   - OrganizationGuard: User must belong to organization
   - RolesGuard: User must have required role

2. **Role Restrictions**:
   ```typescript
   @Post('import')
   @Roles('ADMIN', 'OWNER')
   async importRecords(...) { }
   ```
   - Only ADMIN and OWNER can import data
   - Prevents unauthorized data ingestion

3. **Automatic Organization Tagging**:
   ```typescript
   await this.prisma.lead.create({
     data: {
       firstName: data.firstName,
       lastName: data.lastName,
       organizationId, // ✅ ALWAYS set
       ownerId: userId,
       // ... other fields
     }
   });
   ```
   - Every imported record is tagged with organizationId
   - Ensures data belongs to the correct tenant

4. **Migration Scoping**:
   ```typescript
   // Get migration with ownership verification
   async getMigration(migrationId: string, organizationId: string) {
     return this.prisma.migration.findFirst({
       where: {
         id: migrationId,
         organizationId, // ✅ Prevents cross-tenant access
       }
     });
   }
   ```
   - All migration queries filter by organizationId
   - Users cannot access other organizations' migrations

---

## Critical Security Fixes Applied

### Issue 1: Cross-Tenant Migration Access ✅ FIXED
**Problem**: `getMigration()` and `getMigrationStatus()` didn't filter by organizationId

**Fix**: Added organizationId parameter and filter to both methods
```typescript
// Before (VULNERABLE)
async getMigration(migrationId: string) {
  return this.prisma.migration.findUnique({ where: { id: migrationId } });
}

// After (SECURE)
async getMigration(migrationId: string, organizationId: string) {
  return this.prisma.migration.findFirst({
    where: { id: migrationId, organizationId }
  });
}
```

### Issue 2: Missing RBAC for Import Operations ✅ FIXED
**Problem**: Any authenticated user could import data

**Fix**: Added `@Roles('ADMIN', 'OWNER')` to all import/migration endpoints
```typescript
@Post('import')
@Roles('ADMIN', 'OWNER') // ✅ Only admins can import
async importRecords(...) { }
```

### Issue 3: RolesGuard Checking Wrong Role ✅ FIXED
**Problem**: RolesGuard was checking global `user.role` instead of organization-specific `request.organizationRole`

**Fix**: Updated RolesGuard to prioritize organizationRole
```typescript
// Before (INCORRECT)
return roles.includes(user?.role); // Global role

// After (CORRECT)
const userRole = request.organizationRole || user?.role;
return roles.includes(userRole); // Organization role
```

---

## Security Testing Checklist

### Test Cases for Multi-Tenancy

- [ ] **TC1**: User A from Org 1 cannot access User B's data from Org 2
- [ ] **TC2**: MEMBER role cannot access migration endpoints (403 Forbidden)
- [ ] **TC3**: ADMIN role can import data and it's tagged to their organization
- [ ] **TC4**: User cannot access migration by ID from another organization (404 Not Found)
- [ ] **TC5**: Imported Leads/Contacts/Accounts are scoped to organizationId
- [ ] **TC6**: Migration history only shows migrations for current organization
- [ ] **TC7**: Export only includes records from current organization
- [ ] **TC8**: Duplicate checking is scoped to organization (same email in different orgs is OK)

### Manual Testing Commands

```bash
# Test as MEMBER (should fail)
curl -H "Authorization: Bearer $MEMBER_TOKEN" \
     -X POST http://localhost:3000/api/import-export/import

# Test as ADMIN (should succeed)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     -X POST http://localhost:3000/api/import-export/import \
     -F "file=@leads.csv"

# Test cross-tenant access (should fail with 404)
curl -H "Authorization: Bearer $ORG1_ADMIN_TOKEN" \
     http://localhost:3000/api/import-export/migrations/$ORG2_MIGRATION_ID
```

---

## Best Practices for Developers

### ✅ DO:
1. **Always** use `@CurrentOrganization()` decorator in controllers
2. **Always** filter queries by `organizationId` in services
3. **Always** use guard stack: `@UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)`
4. **Always** add `@@index([organizationId])` to new entity models
5. **Always** set `organizationId` when creating records
6. **Always** pass `organizationId` to service methods for validation

### ❌ DON'T:
1. **Never** query without organizationId filter (except for system admin endpoints)
2. **Never** trust organizationId from request body (use `@CurrentOrganization()`)
3. **Never** use `findUnique()` for multi-tenant data (use `findFirst()` with org filter)
4. **Never** skip OrganizationGuard on protected routes
5. **Never** allow MEMBER role to import/export data
6. **Never** return data without verifying organization ownership

---

## Monitoring & Alerts

### Security Logs to Monitor

1. **Failed authorization attempts**: User trying to access wrong organization
2. **Cross-tenant access attempts**: Request without organizationId
3. **Role violations**: MEMBER trying to access ADMIN endpoints
4. **Suspicious queries**: High volume of 404s for migrations

### Audit Trail

Every migration tracks:
- `userId`: Who performed the import
- `organizationId`: Which organization owns the data
- `createdAt`: When the import occurred
- `fieldMappings`: What mappings were used
- `errors`: Any failures during import

---

## Emergency Response

### If Cross-Tenant Leak Detected:

1. **Immediate**: Kill all backend processes
   ```bash
   pm2 stop salesos-backend
   ```

2. **Investigate**: Check database for leaked records
   ```sql
   SELECT id, organizationId, createdAt FROM leads
   WHERE organizationId IS NULL OR organizationId != 'expected_org_id';
   ```

3. **Fix**: Apply correct organizationId or delete leaked data
   ```sql
   UPDATE leads SET organizationId = 'correct_org_id' WHERE id IN (...);
   -- OR
   DELETE FROM leads WHERE id IN (...);
   ```

4. **Verify**: Run security audit query
   ```sql
   SELECT
     'leads' as entity,
     COUNT(*) as total,
     COUNT(CASE WHEN organizationId IS NULL THEN 1 END) as without_org
   FROM leads
   UNION ALL
   SELECT 'contacts', COUNT(*), COUNT(CASE WHEN organizationId IS NULL THEN 1 END) FROM contacts
   UNION ALL
   SELECT 'accounts', COUNT(*), COUNT(CASE WHEN organizationId IS NULL THEN 1 END) FROM accounts
   UNION ALL
   SELECT 'opportunities', COUNT(*), COUNT(CASE WHEN organizationId IS NULL THEN 1 END) FROM opportunities;
   ```

5. **Restart**: Bring backend back online
   ```bash
   pm2 restart salesos-backend
   ```

6. **Notify**: Inform affected customers per data breach protocol

---

## Compliance Notes

### GDPR / Privacy Compliance
- Each organization's data is logically separated by organizationId
- Data deletion requests are scoped to organizationId
- Data exports (subject access requests) are scoped to organizationId
- Audit logs track who accessed what data

### SOC 2 / ISO 27001
- Role-based access control (RBAC) enforced at application layer
- Principle of least privilege: MEMBER cannot import data
- Audit trail for all data import operations
- Organization-level data isolation prevents lateral movement

---

## References

- [Prisma Multi-Tenancy Guide](https://www.prisma.io/docs/guides/deployment/multi-tenant)
- [NestJS Guards Documentation](https://docs.nestjs.com/guards)
- [OWASP Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)

---

**Last Updated**: 2026-02-14
**Reviewed By**: Security Architecture Team
**Next Review**: 2026-05-14 (Quarterly)
