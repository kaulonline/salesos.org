# Multi-Tenant Development Quick Reference

**Quick reference for developers working on SalesOS multi-tenant features**

---

## ✅ Security Checklist for New Features

When adding a new feature to the multi-tenant CRM:

- [ ] Database model has `organizationId` field
- [ ] Database index on `@@index([organizationId])`
- [ ] Controller uses all 3 guards: `@UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)`
- [ ] Controller uses `@CurrentOrganization()` decorator
- [ ] Service method accepts `organizationId` parameter
- [ ] All queries filter by `organizationId`
- [ ] Role restrictions via `@Roles()` decorator (if needed)
- [ ] Unit tests verify organization scoping
- [ ] NEVER use `findUnique()` for tenant-scoped data (use `findFirst()`)

---

## Controller Pattern

### ✅ CORRECT Implementation

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/strategies/jwt-auth.guard';
import { OrganizationGuard } from '../common/guards/organization.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentOrganization } from '../common/decorators/organization.decorator';

@Controller('leads')
@UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard) // ✅ All 3 guards
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async getLeads(@CurrentOrganization() organizationId: string) {
    // ✅ organizationId from decorator (validated by guards)
    return this.leadsService.findAll(organizationId);
  }

  @Post()
  @Roles('ADMIN', 'OWNER') // ✅ Restrict to ADMIN/OWNER
  async createLead(
    @Body() dto: CreateLeadDto,
    @CurrentOrganization() organizationId: string,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.leadsService.create(dto, userId, organizationId);
  }
}
```

### ❌ WRONG Implementation

```typescript
@Controller('leads')
@UseGuards(JwtAuthGuard) // ❌ Missing OrganizationGuard!
export class LeadsController {
  @Get()
  async getLeads(@Request() req) {
    // ❌ Taking organizationId from request body (can be spoofed!)
    const organizationId = req.body.organizationId;
    return this.leadsService.findAll(organizationId);
  }

  @Post()
  async createLead(@Body() dto: CreateLeadDto) {
    // ❌ No RBAC - anyone can create leads
    // ❌ No organizationId passed to service
    return this.leadsService.create(dto);
  }
}
```

---

## Service Pattern

### ✅ CORRECT Implementation

```typescript
@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    // ✅ Always filter by organizationId
    return this.prisma.lead.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    // ✅ Use findFirst with organizationId filter
    const lead = await this.prisma.lead.findFirst({
      where: {
        id,
        organizationId, // ✅ CRITICAL: Prevents cross-tenant access
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async create(dto: CreateLeadDto, userId: string, organizationId: string) {
    // ✅ Always set organizationId on create
    return this.prisma.lead.create({
      data: {
        ...dto,
        ownerId: userId,
        organizationId, // ✅ CRITICAL: Tags data to organization
      },
    });
  }
}
```

### ❌ WRONG Implementation

```typescript
@Injectable()
export class LeadsService {
  async findAll() {
    // ❌ No organizationId filter - returns ALL leads!
    return this.prisma.lead.findMany();
  }

  async findOne(id: string) {
    // ❌ Using findUnique bypasses org filter
    return this.prisma.lead.findUnique({
      where: { id },
    });
  }

  async create(dto: CreateLeadDto, userId: string) {
    // ❌ No organizationId set - data leak!
    return this.prisma.lead.create({
      data: {
        ...dto,
        ownerId: userId,
        // organizationId is NULL!
      },
    });
  }
}
```

---

## Database Model Pattern

### ✅ CORRECT Schema

```prisma
model Lead {
  id             String  @id @default(cuid())
  organizationId String? // ✅ Multi-tenant isolation field
  ownerId        String

  firstName String
  lastName  String
  email     String?
  // ... other fields

  // Relations
  owner        User          @relation(fields: [ownerId], references: [id])
  organization Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)

  // Indexes
  @@index([organizationId]) // ✅ Index for fast filtering
  @@index([organizationId, ownerId]) // ✅ Composite index for common query
  @@map("leads")
}
```

---

## Guard Order Matters!

**ALWAYS use guards in this order:**

```typescript
@UseGuards(JwtAuthGuard, OrganizationGuard, RolesGuard)
//         1️⃣            2️⃣               3️⃣
```

1. **JwtAuthGuard**: Validates JWT token, sets `request.user`
2. **OrganizationGuard**: Validates org membership, sets `request.organizationId` and `request.organizationRole`
3. **RolesGuard**: Checks if `request.organizationRole` is in `@Roles()` list

---

## Role Restrictions

### When to Use `@Roles()` Decorator

```typescript
// ✅ Use for sensitive operations
@Post('import')
@Roles('ADMIN', 'OWNER') // Only ADMIN/OWNER can import
async importData(...) { }

// ✅ Use for management operations
@Delete('bulk')
@Roles('ADMIN', 'OWNER') // Only ADMIN/OWNER can bulk delete
async bulkDelete(...) { }

// ❌ Don't use for read operations (let all members read)
@Get()
// No @Roles() decorator - all members can read
async getLeads(...) { }
```

### Available Roles

- **OWNER**: Full control, can delete organization
- **ADMIN**: Can manage members, settings, import/export data
- **MANAGER**: Can manage team, view reports (no import/export)
- **MEMBER**: Standard user access (read/write CRM data)

---

## Common Pitfalls

### 🚫 Pitfall 1: Using `findUnique()`

```typescript
// ❌ WRONG - Bypasses organization filter
const lead = await this.prisma.lead.findUnique({
  where: { id: leadId },
});

// ✅ CORRECT - Enforces organization scoping
const lead = await this.prisma.lead.findFirst({
  where: {
    id: leadId,
    organizationId,
  },
});
```

### 🚫 Pitfall 2: Missing `organizationId` on Create

```typescript
// ❌ WRONG - Creates record without organization
await this.prisma.lead.create({
  data: {
    firstName: 'John',
    lastName: 'Doe',
    ownerId: userId,
    // organizationId missing!
  },
});

// ✅ CORRECT - Always set organizationId
await this.prisma.lead.create({
  data: {
    firstName: 'John',
    lastName: 'Doe',
    ownerId: userId,
    organizationId, // ✅ Required!
  },
});
```

### 🚫 Pitfall 3: Taking `organizationId` from Request Body

```typescript
// ❌ WRONG - User can spoof organizationId
@Post()
async createLead(@Body() dto: CreateLeadDto) {
  const organizationId = dto.organizationId; // ❌ Can be faked!
  return this.service.create(dto, organizationId);
}

// ✅ CORRECT - Use decorator (validated by guard)
@Post()
async createLead(
  @Body() dto: CreateLeadDto,
  @CurrentOrganization() organizationId: string, // ✅ Validated!
) {
  return this.service.create(dto, organizationId);
}
```

### 🚫 Pitfall 4: Checking Global `user.role`

```typescript
// ❌ WRONG - Checks global role, not org role
if (req.user.role === 'ADMIN') {
  // User might be global admin but MEMBER in this org!
}

// ✅ CORRECT - Let RolesGuard handle it
@Post()
@Roles('ADMIN', 'OWNER') // ✅ Checks organizationRole
async sensitiveOperation(...) { }
```

---

## Testing Checklist

When writing tests for multi-tenant features:

```typescript
describe('LeadsService - Multi-Tenant Security', () => {
  it('should return leads only for organization', async () => {
    const leads = await service.findAll('org_a');
    expect(prisma.lead.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_a' }, // ✅ Verify org filter
    });
  });

  it('should throw NotFoundException for cross-tenant access', async () => {
    jest.spyOn(prisma.lead, 'findFirst').mockResolvedValue(null);

    await expect(
      service.findOne('lead_123', 'org_b')
    ).rejects.toThrow(NotFoundException);

    expect(prisma.lead.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'lead_123',
        organizationId: 'org_b', // ✅ Different org = not found
      },
    });
  });

  it('should create lead with organizationId', async () => {
    await service.create(dto, 'user_123', 'org_a');

    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org_a', // ✅ Verify org is set
      }),
    });
  });
});
```

---

## Quick Command Reference

```bash
# Run security tests
npm test -- migration.security.spec.ts
npm test -- import-export-rbac.spec.ts

# Run integration tests
./scripts/test-migration-security.sh

# Generate Prisma client after schema changes
npx prisma generate

# Create migration after schema changes
npx prisma migrate dev --name add_organization_scoping

# Check guard coverage
grep -r "@UseGuards" src/ | grep -v "JwtAuthGuard, OrganizationGuard"
# (Should return minimal results - most endpoints need all guards)
```

---

## Emergency Procedures

### If you discover a cross-tenant data leak:

1. **Stop the backend immediately**:
   ```bash
   pm2 stop salesos-backend
   ```

2. **Identify leaked records**:
   ```sql
   SELECT id, organizationId FROM leads
   WHERE organizationId IS NULL OR organizationId != 'expected_org';
   ```

3. **Fix or delete leaked data**:
   ```sql
   -- Option 1: Fix organizationId
   UPDATE leads SET organizationId = 'correct_org' WHERE id IN (...);

   -- Option 2: Delete leaked data
   DELETE FROM leads WHERE id IN (...);
   ```

4. **Verify fix**:
   ```sql
   SELECT COUNT(*) FROM leads WHERE organizationId IS NULL;
   -- Should return 0
   ```

5. **Restart backend**:
   ```bash
   pm2 restart salesos-backend
   ```

6. **Notify security team and affected customers**

---

## Resources

- **Security Documentation**: `/opt/salesos.org/api/docs/MULTI_TENANT_SECURITY.md`
- **Test Results**: `/opt/salesos.org/api/docs/SECURITY_TEST_RESULTS.md`
- **Test Summary**: `/opt/salesos.org/api/TEST_SUMMARY.txt`
- **Prisma Schema**: `/opt/salesos.org/api/prisma/schema.prisma`
- **Guard Implementations**:
  - OrganizationGuard: `/opt/salesos.org/api/src/common/guards/organization.guard.ts`
  - RolesGuard: `/opt/salesos.org/api/src/common/guards/roles.guard.ts`

---

**Remember**: When in doubt, always filter by `organizationId`! 🔒
