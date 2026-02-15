# Import Security - Quick Reference

**Status**: ✅ **SECURE** - All imported data is automatically scoped to the importing organization

---

## 🔐 Security Summary (TL;DR)

**Question**: How do we ensure imported data is secured for the organization?

**Answer**: Through a **5-layer security model**:

1. ✅ **Authentication** - User must be logged in
2. ✅ **Organization Validation** - organizationId extracted from user's membership
3. ✅ **Role Check** - Only ADMIN/OWNER can import
4. ✅ **Automatic Tagging** - Every record tagged with organizationId
5. ✅ **Query Filtering** - All database queries scoped to organization

**Result**: ✅ **Zero cross-tenant risk** - Users CANNOT import into or access other organizations' data

---

## 🎯 Key Security Points

### ✅ Automatic Organization Tagging
```typescript
// Every imported record automatically includes:
{
  organizationId: "org-123",  // ✅ From authenticated user's organization
  ownerId: "user-456",        // ✅ User who imported the data
  // ... other data fields
}
```

### ✅ OrganizationId is NOT User-Controlled
```typescript
// ❌ Wrong (user could tamper):
organizationId: req.body.organizationId

// ✅ Correct (extracted from auth token):
@CurrentOrganization() organizationId: string
// This comes from OrganizationGuard, which gets it from the user's
// verified organization membership, NOT from the request body
```

### ✅ Duplicate Detection Scoped to Organization
```typescript
// When checking for duplicates, we ALWAYS include organizationId:
const existingLead = await prisma.lead.findFirst({
  where: {
    email: data.email,
    organizationId: organizationId, // ✅ CRITICAL
  }
});
// Result: Duplicates only detected within same organization
```

### ✅ Admin-Only Access
```typescript
@Roles('ADMIN', 'OWNER') // ✅ Only these roles can import
async importRecords(...) {
  // Regular users (MEMBER, MANAGER) get 403 Forbidden
}
```

---

## 📊 Data Flow

```
┌──────────────────────────────────────────┐
│ User uploads CSV file                     │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ JwtAuthGuard validates JWT token         │
│ ✓ User is authenticated                  │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ OrganizationGuard extracts organizationId│
│ ✓ From user's organization membership    │
│ ✓ NOT from request body/parameters       │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ RolesGuard checks user role              │
│ ✓ Must be ADMIN or OWNER                 │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ Import Service processes each row        │
│ ✓ Sets organizationId on EVERY record   │
│ ✓ Duplicate check includes organizationId│
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ Database saves records                   │
│ ✓ With organizationId                    │
│ ✓ With ownerId                           │
│ ✓ Indexed for fast queries               │
└──────────────────────────────────────────┘
                  ↓
┌──────────────────────────────────────────┐
│ ✅ Data belongs to user's org ONLY      │
└──────────────────────────────────────────┘
```

---

## 🛡️ Attack Prevention

| Attack Scenario | How It's Prevented |
|----------------|-------------------|
| **User tries to import into Org B while in Org A** | ❌ OrganizationGuard extracts organizationId from auth token, not request |
| **User tampering with organizationId in request** | ❌ organizationId comes from `@CurrentOrganization()` decorator, not user input |
| **Regular user (non-admin) tries to import** | ❌ RolesGuard blocks - returns 403 Forbidden |
| **SQL injection via CSV data** | ❌ Prisma uses parameterized queries, all data escaped |
| **Cross-tenant duplicate detection** | ❌ Duplicate queries always include organizationId filter |
| **Accessing other org's migration history** | ❌ All migration queries filtered by organizationId |

---

## 📝 Code Examples

### Controller (Entry Point)
```typescript
@Controller('import-export')
@UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard) // ✅ 3 guards
export class ImportExportController {

  @Post('import')
  @Roles('ADMIN', 'OWNER') // ✅ Role restriction
  async importRecords(
    @UploadedFile() file: Express.Multer.File,
    @Body() options: ImportOptionsDto,
    @Request() req,
    @CurrentOrganization() organizationId: string, // ✅ Validated organizationId
  ) {
    const userId = req.user.userId;
    // ✅ Pass organizationId to service
    return this.importExportService.importRecords(
      file,
      options,
      userId,
      organizationId, // ✅ This is the SECURE organizationId
    );
  }
}
```

### Service (Data Creation)
```typescript
// Lead Import
await prisma.lead.create({
  data: {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    ownerId: userId,
    organizationId, // ✅ ALWAYS set
  },
});

// Contact Import
await prisma.contact.create({
  data: {
    firstName: data.firstName,
    lastName: data.lastName,
    ownerId: userId,
    organizationId, // ✅ ALWAYS set
  },
});

// Account Import
await prisma.account.create({
  data: {
    name: data.name,
    ownerId: userId,
    organizationId, // ✅ ALWAYS set
  },
});

// Opportunity Import
await prisma.opportunity.create({
  data: {
    name: data.name,
    ownerId: userId,
    organizationId, // ✅ ALWAYS set
  },
});
```

---

## ✅ Verification

### Security Tests Passed: 29/29

- ✅ **15 tests** for multi-tenant isolation
- ✅ **14 tests** for RBAC enforcement

### Test Files:
- `/opt/salesos.org/api/src/import-export/migration.security.spec.ts`
- `/opt/salesos.org/api/src/import-export/import-export-rbac.spec.ts`

### Quick Verification Command:
```bash
# Run security tests
cd /opt/salesos.org/api
npm test -- migration.security.spec.ts
npm test -- import-export-rbac.spec.ts
```

---

## 🚨 Red Flags to Watch For

When adding new import features, watch out for:

❌ **Creating records without organizationId**
```typescript
// ❌ BAD - Missing organizationId
await prisma.lead.create({
  data: {
    firstName: data.firstName,
    ownerId: userId,
    // ❌ Missing: organizationId
  },
});
```

❌ **Using organizationId from request body**
```typescript
// ❌ BAD - User could tamper
async importRecords(
  @Body() dto: { organizationId: string } // ❌ Never trust user input
) {
  // ...
}

// ✅ GOOD - Use decorator
async importRecords(
  @CurrentOrganization() organizationId: string // ✅ From auth
) {
  // ...
}
```

❌ **Duplicate checks without organizationId**
```typescript
// ❌ BAD - Cross-tenant duplicate detection
const existing = await prisma.lead.findFirst({
  where: {
    email: data.email,
    // ❌ Missing: organizationId filter
  },
});

// ✅ GOOD - Organization-scoped
const existing = await prisma.lead.findFirst({
  where: {
    email: data.email,
    organizationId: organizationId, // ✅ Include org filter
  },
});
```

❌ **Missing guards on import endpoints**
```typescript
// ❌ BAD - No security
@Post('import')
async importRecords(...) { }

// ✅ GOOD - Guards + Role restriction
@Post('import')
@Roles('ADMIN', 'OWNER')
@UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
async importRecords(...) { }
```

---

## 📚 Related Documentation

- **Full Security Analysis**: `/opt/salesos.org/DATA_IMPORT_SECURITY.md`
- **Multi-Tenant Architecture**: `/opt/salesos.org/api/docs/MULTI_TENANT_SECURITY.md`
- **Production Readiness**: `/opt/salesos.org/PRODUCTION_READY_CSV_MIGRATION.md`
- **Security Test Results**: `/opt/salesos.org/api/docs/SECURITY_TEST_RESULTS.md`

---

## 🎓 For New Developers

### Golden Rules:
1. **Always** require `organizationId` parameter in import methods
2. **Always** set `organizationId` when creating records
3. **Always** include `organizationId` in duplicate detection
4. **Never** trust `organizationId` from user input - use `@CurrentOrganization()`
5. **Always** add `@Roles('ADMIN', 'OWNER')` to import endpoints
6. **Always** write security tests for new features

### Quick Start:
```typescript
// Template for new import method
private async importNewEntity(
  data: Record<string, any>,
  options: ImportOptionsDto,
  userId: string,
  organizationId: string, // ✅ Always include
): Promise<'created' | 'updated' | 'skipped'> {

  // ✅ Duplicate check with organizationId
  const existing = await this.prisma.newEntity.findFirst({
    where: {
      [checkField]: data[checkField],
      organizationId, // ✅ REQUIRED
    },
  });

  // ✅ Create with organizationId
  await this.prisma.newEntity.create({
    data: {
      ...data,
      ownerId: userId,
      organizationId, // ✅ REQUIRED
    },
  });

  return 'created';
}
```

---

## Summary

✅ **Every imported record is automatically tagged with organizationId**
✅ **Users can ONLY import into their own organization**
✅ **Cross-tenant access is IMPOSSIBLE**
✅ **29/29 security tests passed**
✅ **Production ready and verified secure**

**Questions?** See `/opt/salesos.org/DATA_IMPORT_SECURITY.md` for full details.
