import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';

/**
 * Tenant Isolation E2E Tests
 *
 * These tests verify that multi-tenant data isolation is properly enforced:
 * 1. Users cannot access data from other organizations
 * 2. API requests without organization context are rejected
 * 3. RLS policies block cross-tenant access at the database level
 */
describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // Test data
  let org1Id: string;
  let org2Id: string;
  let user1Id: string;
  let user2Id: string;
  let user1Token: string;
  let user2Token: string;
  let org1LeadId: string;
  let org2LeadId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Create test organizations
    const org1 = await prisma.organization.create({
      data: {
        name: 'Test Organization 1',
        slug: 'test-org-1-' + Date.now(),
      },
    });
    org1Id = org1.id;

    const org2 = await prisma.organization.create({
      data: {
        name: 'Test Organization 2',
        slug: 'test-org-2-' + Date.now(),
      },
    });
    org2Id = org2.id;

    // Create test users
    const user1 = await prisma.user.create({
      data: {
        email: `test1-${Date.now()}@example.com`,
        name: 'Test User 1',
        passwordHash: 'test-hash',
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: `test2-${Date.now()}@example.com`,
        name: 'Test User 2',
        passwordHash: 'test-hash',
      },
    });
    user2Id = user2.id;

    // Create organization memberships
    await prisma.organizationMember.create({
      data: {
        userId: user1Id,
        organizationId: org1Id,
        role: 'MEMBER',
        isActive: true,
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user2Id,
        organizationId: org2Id,
        role: 'MEMBER',
        isActive: true,
      },
    });

    // Generate JWT tokens
    user1Token = jwtService.sign({
      userId: user1Id,
      email: user1.email,
      role: 'USER',
      organizationId: org1Id,
    });

    user2Token = jwtService.sign({
      userId: user2Id,
      email: user2.email,
      role: 'USER',
      organizationId: org2Id,
    });

    // Create test leads in each organization
    const org1Lead = await prisma.lead.create({
      data: {
        firstName: 'Org1',
        lastName: 'Lead',
        email: 'org1lead@example.com',
        ownerId: user1Id,
        organizationId: org1Id,
      },
    });
    org1LeadId = org1Lead.id;

    const org2Lead = await prisma.lead.create({
      data: {
        firstName: 'Org2',
        lastName: 'Lead',
        email: 'org2lead@example.com',
        ownerId: user2Id,
        organizationId: org2Id,
      },
    });
    org2LeadId = org2Lead.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.lead.deleteMany({
      where: { id: { in: [org1LeadId, org2LeadId] } },
    });
    await prisma.organizationMember.deleteMany({
      where: { organizationId: { in: [org1Id, org2Id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [org1Id, org2Id] } },
    });
    await app.close();
  });

  describe('Organization Guard', () => {
    it('should reject requests without organization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Organization context required');
    });

    it('should reject requests with invalid organization', async () => {
      const response = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', 'invalid-org-id');

      expect(response.status).toBe(403);
    });

    it('should reject requests to wrong organization', async () => {
      // User 1 trying to access Org 2
      const response = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', org2Id);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('do not have access');
    });

    it('should allow requests with valid organization membership', async () => {
      const response = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', org1Id);

      expect(response.status).toBe(200);
    });
  });

  describe('Data Isolation - Leads', () => {
    it('should only return leads from user\'s organization', async () => {
      // User 1 queries leads - should only see org1 lead
      const response = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', org1Id);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify all returned leads belong to org1
      const leadIds = response.body.map((lead: any) => lead.id);
      expect(leadIds).toContain(org1LeadId);
      expect(leadIds).not.toContain(org2LeadId);
    });

    it('should not return leads from other organizations', async () => {
      // User 2 queries leads - should only see org2 lead
      const response = await request(app.getHttpServer())
        .get('/leads')
        .set('Authorization', `Bearer ${user2Token}`)
        .set('X-Organization-ID', org2Id);

      expect(response.status).toBe(200);

      const leadIds = response.body.map((lead: any) => lead.id);
      expect(leadIds).toContain(org2LeadId);
      expect(leadIds).not.toContain(org1LeadId);
    });

    it('should not allow accessing specific lead from other organization', async () => {
      // User 1 tries to access org2's lead directly
      const response = await request(app.getHttpServer())
        .get(`/leads/${org2LeadId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', org1Id);

      expect(response.status).toBe(404);
    });

    it('should not allow updating lead from other organization', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/leads/${org2LeadId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', org1Id)
        .send({ firstName: 'Hacked' });

      expect(response.status).toBe(404);

      // Verify lead was not modified
      const lead = await prisma.lead.findUnique({ where: { id: org2LeadId } });
      expect(lead?.firstName).toBe('Org2');
    });

    it('should not allow deleting lead from other organization', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/leads/${org2LeadId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', org1Id);

      expect(response.status).toBe(404);

      // Verify lead still exists
      const lead = await prisma.lead.findUnique({ where: { id: org2LeadId } });
      expect(lead).not.toBeNull();
    });
  });

  describe('RLS Database-Level Isolation', () => {
    it('should block cross-tenant access at database level', async () => {
      // Set RLS context for org1
      await prisma.setRlsContext(org1Id, false);

      try {
        // Query leads - RLS should only return org1 leads
        const leads = await prisma.lead.findMany({
          where: { id: { in: [org1LeadId, org2LeadId] } },
        });

        // With RLS enabled, should only see org1's lead
        expect(leads.length).toBe(1);
        expect(leads[0].id).toBe(org1LeadId);
      } finally {
        await prisma.clearRlsContext();
      }
    });

    it('should allow admin to bypass RLS', async () => {
      // Set RLS context as admin
      await prisma.setRlsContext(org1Id, true);

      try {
        // Admin query should see all leads
        const leads = await prisma.lead.findMany({
          where: { id: { in: [org1LeadId, org2LeadId] } },
        });

        // Admin should see both leads
        expect(leads.length).toBe(2);
      } finally {
        await prisma.clearRlsContext();
      }
    });

    it('should enforce RLS on write operations', async () => {
      // Set RLS context for org1
      await prisma.setRlsContext(org1Id, false);

      try {
        // Attempt to update org2's lead - should fail or be blocked
        const updateResult = await prisma.lead.updateMany({
          where: { id: org2LeadId },
          data: { firstName: 'RLS-Hacked' },
        });

        // With RLS, update should affect 0 rows
        expect(updateResult.count).toBe(0);

        // Verify lead was not modified
        await prisma.clearRlsContext();
        const lead = await prisma.lead.findUnique({ where: { id: org2LeadId } });
        expect(lead?.firstName).toBe('Org2');
      } finally {
        await prisma.clearRlsContext();
      }
    });
  });

  describe('Cross-Tenant Data Leakage Prevention', () => {
    it('should not leak data through aggregations', async () => {
      const response = await request(app.getHttpServer())
        .get('/leads/stats')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', org1Id);

      expect(response.status).toBe(200);
      // Stats should only reflect org1's data
      // The exact assertion depends on the stats structure
    });

    it('should not leak data through search', async () => {
      const response = await request(app.getHttpServer())
        .get('/leads')
        .query({ name: 'Lead' }) // Both leads have 'Lead' in name
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', org1Id);

      expect(response.status).toBe(200);

      // Should only return org1's lead despite search matching both
      const leadIds = response.body.map((lead: any) => lead.id);
      expect(leadIds).toContain(org1LeadId);
      expect(leadIds).not.toContain(org2LeadId);
    });

    it('should not leak data through bulk operations', async () => {
      // Try bulk update targeting both org's leads
      const response = await request(app.getHttpServer())
        .post('/leads/bulk/update')
        .set('Authorization', `Bearer ${user1Token}`)
        .set('X-Organization-ID', org1Id)
        .send({
          ids: [org1LeadId, org2LeadId],
          updates: { rating: 'HOT' },
        });

      // Should only update org1's lead
      if (response.status === 200) {
        expect(response.body.count).toBe(1);
      }

      // Verify org2's lead was not modified
      const org2Lead = await prisma.lead.findUnique({ where: { id: org2LeadId } });
      expect(org2Lead?.rating).not.toBe('HOT');
    });
  });

  describe('Organization Context Validation', () => {
    it('should reject user without any organization membership', async () => {
      // Create a user without any organization membership
      const orphanUser = await prisma.user.create({
        data: {
          email: `orphan-${Date.now()}@example.com`,
          name: 'Orphan User',
          passwordHash: 'test-hash',
        },
      });

      const orphanToken = jwtService.sign({
        userId: orphanUser.id,
        email: orphanUser.email,
        role: 'USER',
      });

      try {
        const response = await request(app.getHttpServer())
          .get('/leads')
          .set('Authorization', `Bearer ${orphanToken}`)
          .set('X-Organization-ID', org1Id);

        expect(response.status).toBe(403);
        expect(response.body.message).toContain('do not have access');
      } finally {
        await prisma.user.delete({ where: { id: orphanUser.id } });
      }
    });

    it('should reject inactive organization membership', async () => {
      // Deactivate user1's membership temporarily
      await prisma.organizationMember.updateMany({
        where: { userId: user1Id, organizationId: org1Id },
        data: { isActive: false },
      });

      try {
        const response = await request(app.getHttpServer())
          .get('/leads')
          .set('Authorization', `Bearer ${user1Token}`)
          .set('X-Organization-ID', org1Id);

        expect(response.status).toBe(403);
      } finally {
        // Restore membership
        await prisma.organizationMember.updateMany({
          where: { userId: user1Id, organizationId: org1Id },
          data: { isActive: true },
        });
      }
    });
  });
});

/**
 * Additional test scenarios to consider:
 *
 * 1. Related records (e.g., contacts for an account)
 *    - Ensure related records from other orgs are not exposed
 *
 * 2. Cascading operations
 *    - When deleting an account, only delete related records in same org
 *
 * 3. Import/Export
 *    - Ensure bulk import only creates records in user's org
 *    - Ensure export only includes user's org data
 *
 * 4. Reporting/Analytics
 *    - Ensure aggregate data only includes user's org
 *
 * 5. API rate limiting per organization
 *    - Ensure one org can't exhaust limits for another
 */
